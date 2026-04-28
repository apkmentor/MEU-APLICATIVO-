"""
End-to-end backend test suite for MentorIA.

Covers:
- Auth (register, login, me, invalid token)
- Tracks (list, by id)
- Prompts (list)
- Chat (create session via message, list sessions, get messages, multi-turn, delete)
- Referral (referral code + counter, register with referred_by)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://infomarketing-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_USER_EMAIL = "teste@mentoria.com"
TEST_USER_PASSWORD = "Teste@1234"


# ---------------- Fixtures ---------------- #
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------------- Health ---------------- #
def test_health(session):
    r = session.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------------- Auth ---------------- #
class TestAuth:
    def test_register_new_user(self, session):
        email = f"TEST_{uuid.uuid4().hex[:8]}@mentoria.com"
        r = session.post(f"{API}/auth/register", json={
            "name": "TEST User",
            "email": email,
            "password": "Senha@1234",
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and len(data["access_token"]) > 20
        u = data["user"]
        assert u["email"] == email.lower()
        assert u["name"] == "TEST User"
        assert "referral_code" in u and len(u["referral_code"]) == 8

    def test_register_duplicate_email(self, session):
        r = session.post(f"{API}/auth/register", json={
            "name": "Dup", "email": TEST_USER_EMAIL, "password": "Senha@1234"
        }, timeout=15)
        assert r.status_code == 400

    def test_login_seeded_user(self, session):
        r = session.post(f"{API}/auth/login",
                         json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert "access_token" in data

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login",
                         json={"email": TEST_USER_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == TEST_USER_EMAIL
        assert "referral_code" in body

    def test_me_without_token(self, session):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = requests.get(f"{API}/auth/me",
                         headers={"Authorization": "Bearer invalid.token.here"}, timeout=15)
        assert r.status_code == 401


# ---------------- Tracks ---------------- #
class TestTracks:
    def test_list_tracks(self, session):
        r = session.get(f"{API}/tracks", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = {t["id"] for t in data}
        assert {"marketing-digital", "afiliacao", "infoprodutos", "conteudo"}.issubset(ids)
        for t in data:
            assert "lessons" in t and len(t["lessons"]) > 0
            assert "title" in t and "image" in t

    def test_get_track_by_id(self, session):
        r = session.get(f"{API}/tracks/marketing-digital", timeout=15)
        assert r.status_code == 200
        t = r.json()
        assert t["id"] == "marketing-digital"
        assert len(t["lessons"]) >= 4

    def test_get_track_not_found(self, session):
        r = session.get(f"{API}/tracks/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---------------- Prompts ---------------- #
def test_list_prompts(session):
    r = session.get(f"{API}/prompts", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 6
    for p in data:
        assert "title" in p and "prompt" in p


# ---------------- Chat ---------------- #
class TestChat:
    session_id = None

    def test_send_first_message_creates_session(self, session, auth_headers):
        r = session.post(f"{API}/chat/message", headers=auth_headers, json={
            "session_id": None,
            "content": "Olá, me apresente em uma frase o que você ensina.",
        }, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data
        assert data["user_message"]["role"] == "user"
        assert data["ai_message"]["role"] == "assistant"
        assert len(data["ai_message"]["content"]) > 10
        TestChat.session_id = data["session_id"]

    def test_list_sessions_includes_new(self, session, auth_headers):
        assert TestChat.session_id, "depends on previous test"
        r = session.get(f"{API}/chat/sessions", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        sessions = r.json()
        assert any(s["id"] == TestChat.session_id for s in sessions)

    def test_get_session_messages(self, session, auth_headers):
        assert TestChat.session_id
        r = session.get(f"{API}/chat/sessions/{TestChat.session_id}/messages",
                        headers=auth_headers, timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"

    def test_multi_turn(self, session, auth_headers):
        assert TestChat.session_id
        r = session.post(f"{API}/chat/message", headers=auth_headers, json={
            "session_id": TestChat.session_id,
            "content": "Com base no que disse antes, qual o primeiro passo prático?",
        }, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == TestChat.session_id
        assert len(data["ai_message"]["content"]) > 10

    def test_empty_message_rejected(self, session, auth_headers):
        r = session.post(f"{API}/chat/message", headers=auth_headers,
                         json={"session_id": None, "content": "   "}, timeout=15)
        assert r.status_code == 400

    def test_chat_requires_auth(self, session):
        r = requests.post(f"{API}/chat/message", json={"content": "hi"}, timeout=15)
        assert r.status_code == 401

    def test_delete_session(self, session, auth_headers):
        assert TestChat.session_id
        r = session.delete(f"{API}/chat/sessions/{TestChat.session_id}",
                           headers=auth_headers, timeout=15)
        assert r.status_code == 200
        # verify gone
        r2 = session.get(f"{API}/chat/sessions/{TestChat.session_id}/messages",
                         headers=auth_headers, timeout=15)
        assert r2.status_code == 404


# ---------------- Referral ---------------- #
class TestReferral:
    def test_my_referral(self, session, auth_headers):
        r = session.get(f"{API}/referral/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "referral_code" in data and len(data["referral_code"]) == 8
        assert "total_referred" in data
        assert isinstance(data["total_referred"], int)

    def test_register_with_referral_code_increments(self, session, auth_headers):
        # Get current count
        r = session.get(f"{API}/referral/me", headers=auth_headers, timeout=15)
        ref_code = r.json()["referral_code"]
        before = r.json()["total_referred"]

        # Register a new user with referred_by
        new_email = f"TEST_ref_{uuid.uuid4().hex[:8]}@mentoria.com"
        rr = session.post(f"{API}/auth/register", json={
            "name": "TEST Referred",
            "email": new_email,
            "password": "Senha@1234",
            "referred_by": ref_code,
        }, timeout=15)
        assert rr.status_code == 200, rr.text
        assert rr.json()["user"].get("referred_by") == ref_code

        # Verify counter incremented
        r2 = session.get(f"{API}/referral/me", headers=auth_headers, timeout=15)
        after = r2.json()["total_referred"]
        assert after == before + 1
