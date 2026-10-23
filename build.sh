#!/usr/bin/env bash
set -o errexit

pipenv install --deploy
pipenv run python manage.py collectstatic --no-input
pipenv run python manage.py migrate