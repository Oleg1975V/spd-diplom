from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView  # Добавлен этот импорт
from rest_framework.exceptions import PermissionDenied  # Добавлен этот импорт
from .models import Post, Comment, Like, PostImage
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from .serializers import PostSerializer, CommentSerializer, UserRegisterSerializer, LikeSerializer


def index(request):
    return render(request, 'posts/index.html')


class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Сортируем по убыванию даты создания (новые сначала)
        return Post.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        # Создание поста требует авторизации
        post = serializer.save(author=self.request.user)
        images = self.request.FILES.getlist('image')  # поддержка нескольких файлов

        for image in images:
            PostImage.objects.create(post=post, image=image)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def delete(self, request, *args, **kwargs):
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'error': 'You are not the owner of this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        post = self.get_object()
        if post.author != request.user:
            return Response(
                {'error': 'You are not the owner of this post'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)

    def perform_update(self, serializer):
        post = self.get_object()
        if post.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Вы не можете редактировать этот пост")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Вы не можете удалить этот пост")
        instance.delete()


class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        post_id = self.kwargs['post_id']
        post = get_object_or_404(Post, id=post_id)
        serializer.save(post=post, author=self.request.user)


class LikeToggleView(generics.CreateAPIView):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        post_id = self.kwargs['post_id']
        post = get_object_or_404(Post, id=post_id)
        user = request.user

        like, created = Like.objects.get_or_create(post=post, user=user)

        if not created:
            like.delete()
            return Response({'status': 'unliked'}, status=status.HTTP_200_OK)

        return Response({'status': 'liked'}, status=status.HTTP_201_CREATED)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]


class DeleteImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
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
            image.delete()
            return Response({'status': 'image deleted'}, status=status.HTTP_200_OK)
        except PostImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )
