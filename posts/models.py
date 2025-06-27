from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_image_size(value):
    """
    Проверяет, что размер изображения не превышает 5MB.

    Args:
        value: Объект файла изображения

    Raises:
        ValidationError: Если размер файла больше 5MB
    """
    filesize = value.size
    max_size = 5 * 1024 * 1024  # 5MB
    if filesize > max_size:
        raise ValidationError(_("Максимальный размер изображения 5MB"))


class Post(models.Model):
    """
    Модель для хранения постов пользователей.

    Attributes:
        author: Автор поста
        text: Текст поста
        created_at: Дата и время создания поста
    """
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='posts'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Возвращает строковое представление поста."""
        return self.text[:50]


class PostImage(models.Model):
    """
    Модель для хранения изображений к постам.

    Attributes:
        post: Связанный пост
        image: Изображение
    """
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name='images'
    )
    image = models.ImageField(
        upload_to='posts/',
        blank=True,
        null=True,
        validators=[
            validate_image_size,
            FileExtensionValidator(
                allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'webp']
            )
        ]
    )

    def __str__(self):
        """Возвращает строковое представление изображения."""
        return f"Image for post {self.post.id}"


class Comment(models.Model):
    """
    Модель для хранения комментариев к постам.

    Attributes:
        post: Связанный пост
        author: Автор комментария
        text: Текст комментария
        created_at: Дата и время создания комментария
    """
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Возвращает строковое представление комментария."""
        return self.text[:50]


class Like(models.Model):
    """
    Модель для хранения лайков к постам.

    Attributes:
        post: Связанный пост
        user: Пользователь, который поставил лайк

    Meta:
        unique_together: Уникальное ограничение на пару (post, user)
    """
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name='likes'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        """Возвращает строковое представление лайка."""
        return f"{self.user.username} likes {self.post.id}"


@receiver(pre_delete, sender=PostImage)
def delete_post_image_files(sender, instance, **kwargs):
    """
    Удаляет файлы изображений при удалении объекта PostImage.

    Args:
        sender: Класс модели, отправляющий сигнал
        instance: Удаляемый экземпляр PostImage
        kwargs: Дополнительные аргументы
    """
    if instance.image:
        instance.image.delete(save=False)


@receiver(pre_delete, sender=Post)
def delete_post_images(sender, instance, **kwargs):
    """
    Удаляет все связанные изображения при удалении поста.

    Args:
        sender: Класс модели, отправляющий сигнал
        instance: Удаляемый экземпляр Post
        kwargs: Дополнительные аргументы
    """
    for image in instance.images.all():
        image.delete()
