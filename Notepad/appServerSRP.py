from base64 import b64encode
from hashlib import sha256
from hmac import HMAC

def signSRP(secret_key,commandHash):# вычисление подписи по ключу и хешу команды
    hash_code = b64encode(HMAC(secret_key.encode(), commandHash.encode(), sha256).digest())# вычисление подписи
    return hash_code.decode('utf-8')#кодирование подписи в строку