document.addEventListener('DOMContentLoaded', () => {
    // DOM элементы
    const elements = {
        newPostForm: document.getElementById('new-post-form'),
        newPostText: document.getElementById('new-post-text'),
        newPostImage: document.getElementById('new-post-image'),
        postsContainer: document.getElementById('posts'),
        loginForm: document.getElementById('login-form'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        registerForm: document.getElementById('register-form'),
        registerUsername: document.getElementById('register-username'),
        registerEmail: document.getElementById('register-email'),
        registerPassword: document.getElementById('register-password'),
        showLoginBtn: document.getElementById('show-login'),
        showRegisterBtn: document.getElementById('show-register'),
        authButtons: document.getElementById('auth-buttons'),
        authForms: document.getElementById('auth-forms'),
        userInfo: document.getElementById('user-info'),
        usernameDisplay: document.getElementById('username-display'),
        logoutBtn: document.getElementById('logout-btn')
    };

    // Показать ошибку
    const showError = (message) => {
        alert(message);
    };

    // Проверить валидность токена
    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        
        try {
            const response = await fetch('http://127.0.0.1:8000/api/posts/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch {
            return false;
        }
    };

    // Получить данные пользователя из токена
    const getUserFromToken = () => {
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.user_id,
                username: payload.username,
                isSuperuser: payload.is_superuser || false
            };
        } catch {
            return null;
        }
    };

    // Обновить UI в зависимости от авторизации
    const updateUI = async () => {
        const isAuth = await checkAuth();
        const user = getUserFromToken();

        if (isAuth && user) {
            // Авторизован
            elements.authForms.classList.add('hidden');
            elements.newPostForm.classList.remove('hidden');
            elements.userInfo.classList.remove('hidden');
            elements.usernameDisplay.textContent = user.username;
            fetchPosts();
        } else {
            // Не авторизован
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            elements.authForms.classList.remove('hidden');
            elements.newPostForm.classList.add('hidden');
            elements.userInfo.classList.add('hidden');
            elements.loginForm.classList.add('hidden');
            elements.registerForm.classList.add('hidden');
            elements.authButtons.classList.remove('hidden');
        }
    };

    // Выход из системы
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.reload(); // Полная перезагрузка страницы
    };

    // Получить посты
    const fetchPosts = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/posts/');
            if (!response.ok) throw new Error('Не удалось получить посты');
            const posts = await response.json();
            renderPosts(posts);
        } catch (error) {
            showError(error.message);
        }
    };

    // Отрисовать посты
    const renderPosts = (posts) => {
        elements.postsContainer.innerHTML = '';
        
        posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.className = 'post';
            postEl.innerHTML = `
                <h3>${post.author}</h3>
                <p>${post.text}</p>
                ${post.image ? `<img src="http://127.0.0.1:8000${post.image}" alt="Post image">` : ''}
                <p class="date">${new Date(post.created_at).toLocaleString()}</p>
                <button class="like-btn" data-id="${post.id}">
                    ${post.likes_count} ${post.likes_count === 1 ? 'лайк' : 'лайков'}
                </button>
                <div class="comments">
                    <h4>Комментарии:</h4>
                    ${post.comments.map(c => `
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
            `;
            elements.postsContainer.appendChild(postEl);
        });

        // Навешиваем обработчики
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
        const formData = new FormData();
        formData.append('text', elements.newPostText.value);
        if (elements.newPostImage.files[0]) {
            formData.append('image', elements.newPostImage.files[0]);
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/posts/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка создания поста');
            }

            elements.newPostText.value = '';
            elements.newPostImage.value = '';
            fetchPosts();
        } catch (error) {
            showError(error.message);
        }
    };

    // Оставить комментарий
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
            fetchPosts();
        } catch (error) {
            showError(error.message);
        }
    };

    // Лайк/дизлайк
    const handleLikeToggle = async (postId) => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) throw new Error('Ошибка лайка');
            fetchPosts();
        } catch (error) {
            showError(error.message);
        }
    };

    // Вход
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: elements.loginUsername.value,
                    password: elements.loginPassword.value
                })
            });

            if (!response.ok) throw new Error('Неверные учетные данные');

            const { access, refresh } = await response.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            updateUI();
        } catch (error) {
            showError(error.message);
        }
    };

    // Регистрация
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: elements.registerUsername.value,
                    email: elements.registerEmail.value,
                    password: elements.registerPassword.value
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(Object.values(error).join(', '));
            }

            // Автоматический вход после регистрации
            const loginResponse = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: elements.registerUsername.value,
                    password: elements.registerPassword.value
                })
            });

            if (!loginResponse.ok) throw new Error('Ошибка входа после регистрации');

            const { access, refresh } = await loginResponse.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            updateUI();
        } catch (error) {
            showError(error.message);
        }
    };

    // Инициализация
    const init = async () => {
        // Навешиваем обработчики
        elements.newPostForm.addEventListener('submit', handleNewPostSubmit);
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.showLoginBtn.addEventListener('click', () => {
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        });
        elements.showRegisterBtn.addEventListener('click', () => {
            elements.registerForm.classList.remove('hidden');
            elements.loginForm.classList.add('hidden');
        });

        // Первоначальная настройка UI
        await updateUI();
    };

    init();
});