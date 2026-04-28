"""
Tests for the new MGM monetization features:
- Subscription plan / me endpoints
- Stripe checkout creation + status polling (test mode, no real card)
- Webhook endpoint sanity (signature verification expected to fail on fake payloads)
- Free user paywall (5 messages/day -> 6th returns 402)
- Referral commission fields exposed on /referral/me
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://infomarketing-hub.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"


def _register_fresh_user(name_prefix="TEST_sub", referred_by=None):
    """Register a fresh user (free plan, no daily_usage history) and return (token, user)."""
    email = f"{name_prefix}_{uuid.uuid4().hex[:8]}@mentoria.com"
    payload = {"name": "TEST Sub User", "email": email, "password": "Senha@1234"}
    if referred_by:
        payload["referred_by"] = referred_by
    r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    return data["access_token"], data["user"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- /subscription/plan (public) ----------------
class TestPlan:
    def test_plan_public_shape(self):
        r = requests.get(f"{API}/subscription/plan", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "premium_mensal"
        assert d["amount"] == 99.9
        assert d["currency"] == "brl"
        assert d["duration_days"] == 30
        assert d["free_daily_limit"] == 5
        assert d["commission_rate"] == 0.15


# ---------------- /subscription/me ----------------
class TestMySubscription:
    def test_fresh_user_is_free_with_5_remaining(self):
        token, _ = _register_fresh_user()
        r = requests.get(f"{API}/subscription/me", headers=_h(token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "free"
        assert d["free_daily_limit"] == 5
        assert d["messages_used_today"] == 0
        assert d["messages_remaining_today"] == 5
        assert d["premium_until"] in (None,)

    def test_unauth(self):
        r = requests.get(f"{API}/subscription/me", timeout=15)
        assert r.status_code == 401


# ---------------- /subscription/checkout ----------------
class TestCheckout:
    def test_creates_stripe_session_and_persists_tx(self):
        token, _ = _register_fresh_user()
        r = requests.post(
            f"{API}/subscription/checkout",
            headers=_h(token),
            json={"origin_url": BASE_URL},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and d["url"].startswith("https://")
        assert "session_id" in d and len(d["session_id"]) > 5
        # Polling status of an unpaid session should return current Stripe status (open / unpaid)
        st = requests.get(
            f"{API}/subscription/checkout/status/{d['session_id']}",
            headers=_h(token),
            timeout=30,
        )
        assert st.status_code == 200, st.text
        sd = st.json()
        assert sd["payment_status"] in ("unpaid", "no_payment_required", "pending")
        assert sd["status"] in ("open", "complete", "expired")

    def test_checkout_requires_auth(self):
        r = requests.post(f"{API}/subscription/checkout", json={"origin_url": BASE_URL}, timeout=15)
        assert r.status_code == 401

    def test_status_unknown_session_404(self):
        token, _ = _register_fresh_user()
        r = requests.get(
            f"{API}/subscription/checkout/status/cs_test_does_not_exist_{uuid.uuid4().hex[:8]}",
            headers=_h(token),
            timeout=15,
        )
        assert r.status_code == 404


# ---------------- /webhook/stripe ----------------
class TestWebhook:
    def test_invalid_signature_rejected(self):
        # Without a valid Stripe-Signature, handle_webhook should raise -> 400
        r = requests.post(
            f"{API}/webhook/stripe",
            data=b'{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_fake"}}}',
            headers={"Content-Type": "application/json", "Stripe-Signature": "t=0,v1=invalid"},
            timeout=15,
        )
        # Expected: 400 invalid webhook (signature fails)
        assert r.status_code in (400, 401, 422), f"Unexpected: {r.status_code} {r.text}"


# ---------------- /referral/me commission fields ----------------
class TestReferralCommissionFields:
    def test_new_user_has_zero_earnings(self):
        token, _ = _register_fresh_user()
        r = requests.get(f"{API}/referral/me", headers=_h(token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["commission_rate"] == 0.15
        assert d["total_earned"] == 0
        assert d["pending"] == 0
        assert d["paid"] == 0
        assert d["total_referred"] == 0
        assert isinstance(d["commissions"], list) and len(d["commissions"]) == 0
        assert d["currency"] == "brl"


# ---------------- Free daily quota / paywall ----------------
class TestPaywall:
    """
    Verify the 6th message returns 402 for a free user. We use a fresh user (no
    prior daily_usage). Because each chat call hits the real LLM and is slow
    (~5-15s), this test is somewhat heavy, but it is the definitive integration test.
    """

    @pytest.mark.timeout(360)
    def test_sixth_message_returns_402(self):
        token, _ = _register_fresh_user(name_prefix="TEST_paywall")
        # Send 5 successful messages
        session_id = None
        for i in range(5):
            r = requests.post(
                f"{API}/chat/message",
                headers=_h(token),
                json={"session_id": session_id, "content": f"oi {i+1}"},
                timeout=120,
            )
            assert r.status_code == 200, f"msg {i+1} failed: {r.status_code} {r.text}"
            session_id = r.json()["session_id"]

        # Verify /subscription/me reports remaining=0
        sm = requests.get(f"{API}/subscription/me", headers=_h(token), timeout=15)
        assert sm.status_code == 200
        smd = sm.json()
        assert smd["messages_used_today"] == 5
        assert smd["messages_remaining_today"] == 0

        # 6th must return 402
        r6 = requests.post(
            f"{API}/chat/message",
            headers=_h(token),
            json={"session_id": session_id, "content": "msg 6"},
            timeout=30,
        )
        assert r6.status_code == 402, f"Expected 402, got {r6.status_code}: {r6.text}"
        body = r6.json()
        # FastAPI default error shape: {"detail": "..."}
        detail = body.get("detail", "")
        assert "limite" in detail.lower() or "upgrade" in detail.lower()
