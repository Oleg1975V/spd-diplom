document.addEventListener('DOMContentLoaded', () => {
    // Конфигурация
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const MEDIA_URL = 'http://127.0.0.1:8000/media';

    // Элементы DOM
    const elements = {
        newPostForm: document.getElementById('new-post-form'),
        newPostText: document.getElementById('new-post-text'),
        newPostImages: document.getElementById('new-post-images'),
        postsContainer: document.getElementById('posts'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutBtn: document.getElementById('logout-btn'),
        userInfo: document.getElementById('user-info'),
        usernameDisplay: document.getElementById('username-display'),
        authForms: document.getElementById('auth-forms'),
        showLoginBtn: document.getElementById('show-login'),
        showRegisterBtn: document.getElementById('show-register')
    };

    // Проверка авторизации
    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/posts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    };

    // Обновление UI
    const updateUI = async () => {
        const isAuth = await checkAuth();
        elements.authForms.classList.toggle('hidden', isAuth);
        elements.newPostForm.classList.toggle('hidden', !isAuth);
        elements.userInfo.classList.toggle('hidden', !isAuth);
        
        if (isAuth) {
            const username = localStorage.getItem('username');
            if (username) elements.usernameDisplay.textContent = username;
            await fetchPosts();
        } else {
            elements.postsContainer.innerHTML = '<p>Войдите или зарегистрируйтесь для просмотра постов</p>';
        }
    };

    // Загрузка постов
    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_BASE_URL}/posts/`, { headers });
            if (!response.ok) throw new Error('Ошибка загрузки постов');
            
            const data = await response.json();
            renderPosts(data.results || data);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Отрисовка постов
    const renderPosts = (posts) => {
        elements.postsContainer.innerHTML = posts.length ? posts.map(post => `
            <div class="post" data-id="${post.id}">
                <h3>${post.author}</h3>
                <p>${post.text}</p>
                ${post.images && post.images.length ? `
                    <div class="post-images">
                        ${post.images.map(img => `<img src="${img}" alt="Post image" style="max-width: 100%; height: auto;">`).join('')}
                    </div>
                ` : ''}
                <p>${new Date(post.created_at).toLocaleString()}</p>
                <button class="like-btn" data-id="${post.id}">
                    ❤️ ${post.likes_count} ${post.likes_count === 1 ? 'лайк' : 'лайков'}
                </button>
                <div class="comments">
                    <h4>Комментарии (${post.comments ? post.comments.length : 0})</h4>
                    ${(post.comments || []).map(comment => `
                        <div class="comment">
                            <strong>${comment.author}:</strong> ${comment.text}
                            <small>${new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                    `).join('')}
                    <form class="comment-form" data-id="${post.id}">
                        <input type="text" placeholder="Ваш комментарий" required>
                        <button type="submit">Отправить</button>
                    </form>
                </div>
            </div>
        `).join('') : '<p>Пока нет постов</p>';

        // Назначение обработчиков
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id));
        });

        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input');
                handleComment(form.dataset.id, input.value);
                input.value = '';
            });
        });
    };

    // Создание поста
    const handleNewPost = async (e) => {
        e.preventDefault();
        const text = elements.newPostText.value.trim();
        const images = elements.newPostImages.files;

        if (!text) return alert('Введите текст поста');
        if (images.length > 10) return alert('Не более 10 изображений');

        const formData = new FormData();
        formData.append('text', text);
        Array.from(images).forEach(img => formData.append('images', img));

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Ошибка создания поста');

            elements.newPostText.value = '';
            elements.newPostImages.value = '';
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Остальные обработчики (лайки, комментарии, авторизация)
    const handleLike = async (postId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Ошибка лайка');
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    const handleComment = async (postId, text) => {
        if (!text.trim()) return alert('Введите комментарий');
        
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('Ошибка комментария');
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Ошибка авторизации');

            const { access, refresh } = await response.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', username);
            await updateUI();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(Object.values(errorData).join(', '));
            }

            alert('Регистрация успешна! Войдите в систему.');
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        updateUI();
    };

    // Инициализация
    const init = () => {
        elements.newPostForm.addEventListener('submit', handleNewPost);
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
        updateUI();
    };

    init();
});