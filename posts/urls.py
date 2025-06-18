from django.urls import path
from .views import PostListCreateView, PostDetailView, CommentCreateView, LikeToggleView, index, RegisterView

urlpatterns = [
    path('', index, name='index'),
    path('posts/', PostListCreateView.as_view(), name='post-list-create'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('posts/<int:post_id>/comments/', CommentCreateView.as_view(), name='comment-create'),
    path('posts/<int:post_id>/like/', LikeToggleView.as_view(), name='like-toggle'),
    path('register/', RegisterView.as_view(), name='register'),
]
