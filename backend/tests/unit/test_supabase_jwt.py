import pytest
from fastapi import HTTPException
from jwt import encode
from fastapi.security import HTTPAuthorizationCredentials
from cryptography.hazmat.primitives.asymmetric import rsa
import jwt

from app.api.deps import verify_supabase_jwt_token, _JWKS_CACHE, _JWKS_CACHE_EXPIRES


def _gen_rsa_key():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return priv, priv.public_key()


def _make_jwks(pub, kid="test"):
    numbers = pub.public_numbers()
    e = jwt.utils.base64url_encode(
        numbers.e.to_bytes((numbers.e.bit_length() + 7) // 8, "big")
    ).decode()
    n = jwt.utils.base64url_encode(
        numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")
    ).decode()
    return {
        "keys": [
            {"kty": "RSA", "kid": kid, "use": "sig", "alg": "RS256", "e": e, "n": n}
        ]
    }


def _mock_jwks(monkeypatch, jwks):
    class Resp:
        def json(self):
            return jwks

        def raise_for_status(self):
            pass

    monkeypatch.setattr("app.api.deps.requests.get", lambda url, timeout=5: Resp())


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _reset_cache():
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRES
    _JWKS_CACHE = None
    _JWKS_CACHE_EXPIRES = 0


def test_valid_token(monkeypatch):
    priv, pub = _gen_rsa_key()
    _mock_jwks(monkeypatch, _make_jwks(pub))
    token = encode({"sub": "user123"}, priv, algorithm="RS256", headers={"kid": "test"})
    _reset_cache()
    payload = verify_supabase_jwt_token(_creds(token))
    assert payload["sub"] == "user123"


def test_invalid_signature(monkeypatch):
    priv_valid, pub_valid = _gen_rsa_key()
    priv_bad, _ = _gen_rsa_key()
    _mock_jwks(monkeypatch, _make_jwks(pub_valid))
    token = encode(
        {"sub": "user123"}, priv_bad, algorithm="RS256", headers={"kid": "test"}
    )
    _reset_cache()
    with pytest.raises(HTTPException):
        verify_supabase_jwt_token(_creds(token))


def test_malformed_token(monkeypatch):
    _, pub = _gen_rsa_key()
    _mock_jwks(monkeypatch, _make_jwks(pub))
    bad_token = "abc.def.ghi"
    _reset_cache()
    with pytest.raises(HTTPException):
        verify_supabase_jwt_token(_creds(bad_token))
