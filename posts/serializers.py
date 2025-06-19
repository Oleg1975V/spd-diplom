from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, Comment, Like

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        error_messages={
            'min_length': 'Пароль должен содержать не менее 8 символов.'
        }
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {
            'username': {
                'min_length': 4,
                'error_messages': {
                    'min_length': 'Имя пользователя должно содержать не менее 4 символов.'
                }
            }
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_text(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Комментарий должен содержать не менее 2 символов.")
        return value

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['user', 'post']
        read_only_fields = ['user']


class LikeSerializer(serializers.Serializer):
    """Пустой сериализатор, т.к. лайк не требует входных данных."""
    pass


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False)
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'author', 'text', 'image', 'created_at', 'comments', 'likes_count']
        read_only_fields = ['id', 'created_at', 'likes_count']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def validate_text(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Текст поста должен содержать не менее 5 символов.")
        return value

    def validate_image(self, value):
        if value.size > 5 * 1024 * 1024:  # 5MB
            raise serializers.ValidationError("Размер изображения не должен превышать 5MB.")
        return value