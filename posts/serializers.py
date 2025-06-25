import os
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, PostImage, Comment, Like


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        error_messages={
            'min_length': 'Пароль должен содержать не менее 8 символов, латинские буквы и цифры, спецсимволы.'
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
                    'min_length': 'Имя пользователя должно содержать не менее 4 символов, буквы или цифры, тире, подчеркивание, точка.'
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


class PostImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = PostImage
        fields = ['id', 'image']
        read_only_fields = ['id']

    def validate_image(self, value):
        # Проверка размера
        if value.size > 5 * 1024 * 1024:  # 5MB
            raise serializers.ValidationError("Размер изображения не должен превышать 5MB.")
        
        # Проверка формата
        valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        extension = os.path.splitext(value.name)[1].lower()
        if extension not in valid_extensions:
            raise serializers.ValidationError(
                "Неподдерживаемый формат изображения. Допустимые форматы: JPG, JPEG, PNG, GIF, WEBP"
            )
        
        return value


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


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    images = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author', 'text', 'images', 'created_at', 'comments', 'likes_count', 'can_edit']
        read_only_fields = ['id', 'created_at', 'likes_count']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return request and (request.user == obj.author or request.user.is_staff)

    def get_images(self, obj):
        request = self.context.get('request')
        images = obj.images.all()
        result = []

        for image in images:
            try:
                if image.image:  # Проверяем, есть ли изображение
                    url = image.image.url
                    if request:
                        url = request.build_absolute_uri(url)
                    result.append(url)
            except ValueError:
                # Если файл отсутствует, пропускаем его
                continue

        return result


    def validate_text(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Текст поста должен содержать не менее 5 символов.")
        return value

    def create(self, validated_data):
        post = Post.objects.create(**validated_data)
        images_data = self.context.get('view').request.FILES.getlist('images')
        if len(images_data) > 10:
            raise serializers.ValidationError("Необходимо загрузить не более 10 изображений.")
        for image_data in images_data:
            PostImage.objects.create(post=post, image=image_data)
        return post

    def update(self, instance, validated_data):
        # Обновляем текст
        instance.text = validated_data.get('text', instance.text)
        instance.save()

        # Обработка новых изображений
        if 'images' in self.context.get('request').FILES:
            for image in self.context.get('request').FILES.getlist('images'):
                PostImage.objects.create(post=instance, image=image)

        return instance
