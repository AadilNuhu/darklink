"""
Django settings for server project.
"""

import os
from pathlib import Path

import dj_database_url
from corsheaders.defaults import default_headers as _cors_default_headers
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name):
    return os.environ.get(name, '').replace(',', ' ').split()

SALT_KEY = os.environ["SALT_KEY"]

DEBUG = env_bool('DJANGO_DEBUG', default=True)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY and not DEBUG:
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY must be configured when DJANGO_DEBUG is False.'
    )
SECRET_KEY = SECRET_KEY or (
    'django-insecure-_bdr166#m)=%)^eubi$h-x3g(=*j)z1@4n=z$@**o99aipmcpy'
)

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS')
if DEBUG:
    ALLOWED_HOSTS += ['localhost', '127.0.0.1', '[::1]', 'testserver']
elif not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        'DJANGO_ALLOWED_HOSTS must be configured when DJANGO_DEBUG is False.'
    )

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# Application definition

INSTALLED_APPS = [
    # 'django.contrib.admin',
    # 'django.contrib.auth',
    # 'django.contrib.contenttypes',
    # 'django.contrib.sessions',
    # 'django.contrib.messages',
    'daphne',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'chat_app.apps.ChatAppConfig',
    'user',
    'channels',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # 'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    # 'django.contrib.auth.middleware.AuthenticationMiddleware',
    # 'django.contrib.messages.middleware.MessageMiddleware',
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                # 'django.contrib.auth.context_processors.auth',
                # 'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'
ASGI_APPLICATION = 'server.asgi.application'
CHAT_CONNECTION_TIMEOUT_SECONDS = 120

# Channels
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [REDIS_URL]},
        },
    }
else:
    # In-memory layer: single-process/dev only, not for production.
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }


# PostgreSQL is required in every environment.
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ImproperlyConfigured('DATABASE_URL must be configured.')
if not DATABASE_URL.lower().startswith(('postgres://', 'postgresql://')):
    raise ImproperlyConfigured('DATABASE_URL must use PostgreSQL.')

DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        ssl_require=True,
    )
}


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
}

CORS_ALLOW_ALL_ORIGINS = env_bool('CORS_ALLOW_ALL_ORIGINS', default=DEBUG)
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_HEADERS = list(_cors_default_headers) + ['x-admin-username', 'x-admin-code']