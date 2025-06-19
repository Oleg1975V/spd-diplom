document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const elements = {
        newPostForm: document.getElementById('new-post-form'),
        newPostText: document.getElementById('new-post-text'),
        newPostImages: document.getElementById('new-post-images'),
        postsContainer: document.getElementById('posts'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutBtn: document.getElementById('logout-btn')
    };

    // Проверка элементов
    if (Object.values(elements).some(el => !el)) {
        console.error('Some required elements are missing');
        return;
    }

    // Показать ошибку
    const showError = (message) => {
        console.error(message);
        alert(message);
    };

    // Проверка авторизации
    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        try {
            const response = await fetch('http://127.0.0.1:8000/api/posts/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    };

    // Обновить интерфейс
    const updateUI = async () => {
        const isAuth = await checkAuth();
        document.getElementById('auth-forms').classList.toggle('hidden', isAuth);
        document.getElementById('new-post-form').classList.toggle('hidden', !isAuth);
        document.getElementById('user-info').classList.toggle('hidden', !isAuth);
        if (isAuth) {
            await fetchPosts();
        }
    };

    // Загрузка постов
    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch('http://127.0.0.1:8000/api/posts/', { headers });
            if (!response.ok) throw new Error('Failed to fetch posts');
            const data = await response.json();
            renderPosts(data.results || data);
        } catch (error) {
            console.error('Error loading posts:', error);
            showError(error.message);
        }
    };

    // Отрисовка постов
    const renderPosts = (posts) => {
        if (!elements.postsContainer) return;
        elements.postsContainer.innerHTML = posts.length ? posts.map(post => `
            <div class="post" data-id="${post.id}">
                <h3>${post.author}</h3>
                <p>${post.text}</p>
                <div class="post-images">
                    ${post.images.map(img => `<img src="${img}" alt="Post image">`).join('')}
                </div>
                <p class="date">${new Date(post.created_at).toLocaleString()}</p>
                <button class="like-btn" data-id="${post.id}">
                    ${post.likes_count} ${post.likes_count === 1 ? 'лайк' : 'лайков'}
                </button>
                <div class="comments">
                    <h4>Комментарии:</h4>
                    ${(post.comments || []).map(c => `
                        <div class="comment">
                            <strong>${c.author}:</strong> ${c.text}
                            <small>${new Date(c.created_at).toLocaleString()}</small>
                        </div>
                    `).join('')}
                    <form class="comment-form" data-id="${post.id}">
                        <input type="text" placeholder="Ваш комментарий" required>
                        <button type="submit">Отправить</button>
                    </form>
                </div>
            </div>
        `).join('') : '<p>Пока нет постов</p>';
        // Обработчики событий
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLikeToggle(btn.dataset.id));
        });
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input');
                handleCommentSubmit(form.dataset.id, input.value);
                input.value = '';
            });
        });
    };

    // Создать пост
    const handleNewPostSubmit = async (e) => {
        e.preventDefault();
        const imagesFiles = elements.newPostImages.files;
        if (imagesFiles.length > 10) {
            showError('Необходимо загрузить не более 10 изображений.');
            return;
        }
        const formData = new FormData();
        formData.append('text', elements.newPostText.value);
        for (let i = 0; i < imagesFiles.length; i++) {
            formData.append('images', imagesFiles[i]);
        }
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Необходимо авторизоваться');
            const response = await fetch('http://127.0.0.1:8000/api/posts/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка создания поста');
            }
            elements.newPostText.value = '';
            elements.newPostImages.value = '';
            await fetchPosts();
        } catch (error) {
            console.error('Ошибка создания поста:', error);
            showError(error.message);
        }
    };

    // Остальные обработчики (комментарии, лайки, авторизация)
    const handleCommentSubmit = async (postId, text) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/comments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('Ошибка добавления комментария');
            await fetchPosts();
        } catch (error) {
            showError(error.message);
        }
    };

    const handleLikeToggle = async (postId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (!response.ok) throw new Error('Ошибка лайка');
            await fetchPosts();
        } catch (error) {
            showError(error.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('login-username').value,
                    password: document.getElementById('login-password').value
                })
            });
            if (!response.ok) throw new Error('Неверные учетные данные');
            const { access, refresh } = await response.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            await updateUI();
        } catch (error) {
            showError(error.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('register-username').value,
                    email: document.getElementById('register-email').value,
                    password: document.getElementById('register-password').value
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(Object.values(error).join(', '));
            }
            showError('Регистрация успешна! Теперь войдите.');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
        } catch (error) {
            showError(error.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.reload();
    };

    // Инициализация
    const init = () => {
        elements.newPostForm.addEventListener('submit', handleNewPostSubmit);
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.logoutBtn.addEventListener('click', handleLogout);
        document.getElementById('show-login').addEventListener('click', () => {
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
        });
        document.getElementById('show-register').addEventListener('click', () => {
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('login-form').classList.add('hidden');
        });
        updateUI();
    };

    init();
});