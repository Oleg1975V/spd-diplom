# Социальная сеть для публикаций постов с фотографиями

## Описание проекта

Социальная сеть, позволяющая пользователям публиковать текстовые посты с изображениями, оставлять комментарии и ставить лайки. Приложение реализовано на Django 5.2.3 и Django REST framework, использует PostgreSQL в качестве СУБД и JWT для аутентификации.

## Возможности

- Авторизация пользователей через систему токенов

- Создание, редактирование и удаление постов, добавление изображений к постам (только авторами)

- Комментирование постов и лайкование постов (только авторизованными пользователями)

- Просмотр списка постов с информацией о количестве лайков и списком комментариев

- Административная панель Django для управления данными

## Требования

- Python 3.8+

- PostgreSQL

## Установка

1. Клонировать репозиторий:

2. Создать и активировать виртуальное окружение:

3. Установить зависимости:
pip install -r requirements.txt

4. Создать файл .env в корне проекта:  
SECRET\_KEY=your-secret-key  
DEBUG=True  
ALLOWED\_HOSTS=localhost,127.0.0.1  
DATABASE\_NAME=your\_db\_name  
DATABASE\_USER=your\_db\_user  
DATABASE\_PASSWORD=your\_db\_password  
DATABASE\_HOST=localhost  
DATABASE\_PORT=5432  

5. Применить миграции:
python manage.py makemigrations
python manage.py migrate

6. Создать суперпользователя:
python manage.py createsuperuser

7. Запустить сервер:
python manage.py runserver

## API Endpoints

- Аутентификация
POST /api/token/ - получить токены (username и password)
POST /api/register/ - зарегистрировать нового пользователя

- Посты
GET /api/posts/ - получить список всех постов
POST /api/posts/ - создать новый пост (требуется авторизация)
GET /api/posts/{id}/ - получить детали конкретного поста
PUT /api/posts/{id}/ - обновить пост (только автором)
DELETE /api/posts/{id}/ - удалить пост (только автором)

- Комментарии
GET /api/posts/{post\_id}/comments/ - получить список комментариев к посту
POST /api/posts/{post\_id}/comments/ - оставить комментарий (требуется авторизация)

- Лайки
POST /api/posts/{post\_id}/like/ - поставить/убрать лайк (требуется авторизация)

## REST Client API

Используйте файл requests-examples.http
