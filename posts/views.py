from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Post, Comment, Like, PostImage
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from .serializers import (
    PostSerializer,
    CommentSerializer,
    UserRegisterSerializer,
    LikeSerializer
)


def index(request):
    """Отображает главную страницу приложения."""
    return render(request, 'posts/index.html')


class PostListCreateView(generics.ListCreateAPIView):
    """
    Представление для отображения списка постов и создания новых.

    GET: Получить список всех постов
    POST: Создать новый пост
    """
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """
        Возвращает список постов, отсортированных по дате

        Returns:
            QuerySet: Отсортированные посты
        """
        return Post.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        """
        Создает новый пост и связанные изображения.

        Args:
            serializer: Сериализатор с валидированными данными

        Raises:
            ValidationError: Если возникла ошибка при создании изображений
        """
        post = serializer.save(author=self.request.user)
        images = self.request.FILES.getlist('image')

        for image in images:
            try:
                PostImage.objects.create(post=post, image=image)
            except (ValidationError, DjangoValidationError) as e:
                post.delete()
                raise serializers.ValidationError({'images': str(e)})


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Представление для отображения, обновления и удаления конкретного поста.

    GET: Получить детали поста
    PUT: Обновить пост
    DELETE: Удалить пост
    """
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        """
        Возвращает контекст сериализатора с текущим запросом.

        Returns:
            dict: Контекст с объектом запроса
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def delete(self, request, *args, **kwargs):
        """
        Удаляет пост, если пользователь является его автором.

        Args:
            request: HTTP-запрос
            args: Дополнительные аргументы
            kwargs: Дополнительные именованные аргументы

        Returns:
            Response: Ответ с сообщением об успешном удалении
            или ошибкой доступа
        """
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'error': 'You are not the owner of this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        self.perform_destroy(post)
        return Response(
            {'message': 'Пост успешно удален'},
            status=status.HTTP_200_OK
        )

    def put(self, request, *args, **kwargs):
        """
        Обновляет пост, если пользователь является его автором.

        Args:
            request: HTTP-запрос
            args: Дополнительные аргументы
            kwargs: Дополнительные именованные аргументы

        Returns:
            Response: Ответ с результатом операции
        """
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'error': 'You are not the owner of this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)

    def perform_update(self, serializer):
        """
        Выполняет обновление поста.

        Args:
            serializer: Сериализатор с валидированными данными

        Raises:
            PermissionDenied: Если пользователь не имеет прав на редактирование
        """
        post = self.get_object()
        if post.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Вы не можете редактировать этот пост")
        serializer.save()

    def perform_destroy(self, instance):
        """
        Выполняет удаление поста.

        Args:
            instance: Экземпляр модели Post

        Raises:
            PermissionDenied: Если пользователь не имеет прав на удаление
        """
        if (instance.author != self.request.user
                and not self.request.user.is_staff):
            raise PermissionDenied("Вы не можете удалить этот пост")
        instance.delete()


class CommentCreateView(generics.ListCreateAPIView):
    """
    Представление для отображения списка комментариев и создания новых.

    GET: Получить список комментариев к посту
    POST: Создать новый комментарий
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def get_permissions(self):
        """
        Определяет права доступа в зависимости от метода запроса.

        Returns:
            list: Список классов разрешений
        """
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Возвращает список комментариев к определенному посту.

        Returns:
            QuerySet: Комментарии, отфильтрованные по ID поста
        """
        post_id = self.kwargs['post_id']
        return Comment.objects.filter(post_id=post_id).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Создает новый комментарий.

        Args:
            serializer: Сериализатор с валидированными данными
        """
        post = get_object_or_404(Post, id=self.kwargs['post_id'])
        serializer.save(post=post, author=self.request.user)


class LikeToggleView(generics.CreateAPIView):
    """
    Представление для переключения лайка.

    POST: Ставит/убирает лайк к посту
    """
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Обрабатывает POST-запрос для переключения лайка.

        Args:
            request: HTTP-запрос
            args: Дополнительные аргументы
            kwargs: Дополнительные именованные аргументы

        Returns:
            Response: Ответ с статусом лайка
        """
        post_id = self.kwargs['post_id']
        post = get_object_or_404(Post, id=post_id)
        user = request.user

        like, created = Like.objects.get_or_create(post=post, user=user)

        if not created:
            like.delete()
            return Response(
                {'status': 'unliked'},
                status=status.HTTP_200_OK
            )

        return Response(
            {'status': 'liked'},
            status=status.HTTP_201_CREATED
        )


class RegisterView(generics.CreateAPIView):
    """
    Представление для регистрации новых пользователей.

    POST: Регистрация нового пользователя
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]


class DeleteImageView(APIView):
    """
    Представление для удаления изображения из поста.

    POST: Удалить указанное изображение
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """
        Удаляет изображение из поста.

        Args:
            request: HTTP-запрос
            pk: ID поста

        Returns:
            Response: Ответ с результатом операции
        """
        post = get_object_or_404(Post, id=pk)
        if post.author != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You are not the owner of this post'},
                status=status.HTTP_403_FORBIDDEN
            )

        image_name = request.data.get('image_name')
        if not image_name:
            return Response(
                {'error': 'Image name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image = post.images.get(image__endswith=image_name)
            try:
                image.image.delete(save=False)
                image.delete()
                return Response(
                    {'status': 'image deleted'},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {'error': f'Error deleting image file: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except PostImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DeleteCommentView(generics.DestroyAPIView):
    """
    Представление для удаления комментария.

    DELETE: Удалить комментарий
    """
    queryset = Comment.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        """
        Удаляет комментарий, если пользователь является автором поста.

        Args:
            request: HTTP-запрос
            args: Дополнительные аргументы
            kwargs: Дополнительные именованные аргументы

        Returns:
            Response: Ответ с результатом операции
        """
        comment = self.get_object()
        post = comment.post
        if post.author != request.user and not request.user.is_staff:
            return Response(
                {'error': 'У вас нет прав на удаление этого комментария'},
                status=status.HTTP_403_FORBIDDEN
            )
        comment.delete()
        return Response(
            {'message': 'Комментарий успешно удален'},
            status=status.HTTP_200_OK
        )
