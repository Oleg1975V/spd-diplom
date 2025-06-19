from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Post, PostImage, Comment, Like

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 10

class PostInline(admin.TabularInline):
    model = Post
    extra = 0
    fields = ('text', 'created_at')
    readonly_fields = ('created_at',)
    inlines = [PostImageInline]

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'text', 'likes_count', 'created_at')
    list_display_links = ('id', 'text')
    list_filter = ('author', 'created_at')
    search_fields = ('text', 'author__username')
    autocomplete_fields = ['author']
    readonly_fields = ('created_at', 'likes_count')
    inlines = [PostImageInline]
    fieldsets = (
        (None, {
            'fields': ('author', 'text')
        }),
        ('Дополнительно', {
            'fields': ('created_at', 'likes_count'),
            'classes': ('collapse',)
        }),
    )

    def likes_count(self, obj):
        return obj.likes.count()
    likes_count.short_description = 'Лайки'
    likes_count.admin_order_field = 'likes__count'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'author', 'text', 'created_at')
    list_filter = ('author', 'created_at')
    search_fields = ('text', 'author__username')
    raw_id_fields = ('post', 'author')


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'user')
    list_filter = ('user',)
    raw_id_fields = ('post', 'user')
    date_hierarchy = 'post__created_at'


class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'date_joined', 'post_count')
    inlines = [PostInline]

    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = 'Количество постов'

admin.site.unregister(User)
admin.site.register(User, UserAdmin)
