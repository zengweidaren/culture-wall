const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const GITHUB_CONFIG = {
    owner: 'zengweidaren',
    repo: 'culture-wall',
    branch: 'master',
    uploadsPath: 'uploads',
    token: localStorage.getItem('githubToken') || '',
    apiBase: 'https://api.github.com'
};

if (!GITHUB_CONFIG.token) {
    console.warn('GitHub Token 未配置 图片上传功能不可用。请在浏览器控制台设置: localStorage.setItem("githubToken", "your_token")');
}

class CultureWall {
    constructor() {
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.images = [];
        this.viewMode = 'monthly';
        
        this.init();
    }

    async init() {
        this.initParticles();
        this.bindEvents();
        await this.loadImagesFromGithub();
        this.render();
    }

    initParticles() {
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });
            requestAnimationFrame(animate);
        };
        animate();
    }

    bindEvents() {
        document.getElementById('currentYearMonth').textContent = `${this.currentYear}年`;

        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMonth = parseInt(btn.dataset.month);
                this.renderGallery();
            });
        });

        document.getElementById('btnMonthly').addEventListener('click', () => this.setViewMode('monthly'));
        document.getElementById('btnOverview').addEventListener('click', () => this.setViewMode('overview'));

        const uploadArea = document.getElementById('uploadArea');
        const inputUpload = document.getElementById('inputUpload');

        uploadArea.addEventListener('click', () => inputUpload.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleUpload(file);
            }
        });
        inputUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleUpload(file);
            }
        });

        document.getElementById('btnClosePreview').addEventListener('click', () => {
            document.getElementById('modalPreview').classList.remove('active');
        });
        document.getElementById('modalPreview').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('modalPreview').classList.remove('active');
            }
        });

        document.getElementById('btnSettings').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('btnSaveToken').addEventListener('click', () => this.saveGithubToken());
        document.getElementById('btnClearToken').addEventListener('click', () => this.clearGithubToken());
    }

    setViewMode(mode) {
        this.viewMode = mode;
        document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
        document.getElementById('btnOverview').classList.toggle('active', mode === 'overview');
        document.getElementById('monthSelector').style.display = mode === 'monthly' ? 'block' : 'none';
        document.getElementById('sectionUpload').style.display = mode === 'monthly' ? 'block' : 'none';
        document.getElementById('sectionGallery').style.display = mode === 'monthly' ? 'block' : 'none';
        document.getElementById('sectionAllMonths').style.display = mode === 'overview' ? 'block' : 'none';
        
        if (mode === 'overview') {
            this.renderAllMonths();
        } else {
            this.renderGallery();
        }
    }

    showSettingsModal() {
        const token = localStorage.getItem('githubToken') || '';
        document.getElementById('inputGithubToken').value = token;
        this.updateTokenStatus();
        document.getElementById('modalSettings').classList.add('active');
    }

    hideSettingsModal() {
        document.getElementById('modalSettings').classList.remove('active');
    }

    saveGithubToken() {
        const token = document.getElementById('inputGithubToken').value.trim();
        if (token) {
            localStorage.setItem('githubToken', token);
            GITHUB_CONFIG.token = token;
            this.hideSettingsModal();
            this.showToast('Token 保存成功！');
        } else {
            this.showToast('请输入 Token');
        }
    }

    clearGithubToken() {
        localStorage.removeItem('githubToken');
        GITHUB_CONFIG.token = '';
        document.getElementById('inputGithubToken').value = '';
        this.updateTokenStatus();
        this.showToast('Token 已清除');
    }

    updateTokenStatus() {
        const status = document.getElementById('tokenStatus');
        if (GITHUB_CONFIG.token) {
            status.innerHTML = '<span class="token-ok">✓ Token 已配置</span>';
        } else {
            status.innerHTML = '<span class="token-empty">✗ Token 未配置</span>';
        }
    }

    async githubApi(path, options = {}) {
        const url = `${GITHUB_CONFIG.apiBase}${path}`;
        const headers = {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'GitHub API error');
            }
            return data;
        } catch (error) {
            console.error('GitHub API error:', error);
            throw error;
        }
    }

    async loadImagesFromGithub() {
        if (!GITHUB_CONFIG.token) {
            console.warn('Token 未配置，无法从 GitHub 加载图片');
            this.images = [];
            return;
        }

        try {
            const data = await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.uploadsPath}?ref=${GITHUB_CONFIG.branch}`);
            
            if (!Array.isArray(data)) {
                console.log('uploads 目录不存在或为空');
                this.images = [];
                return;
            }

            this.images = data
                .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))
                .map(file => {
                    const parsed = this.parseFileName(file.name);
                    return {
                        name: file.name,
                        path: file.path,
                        downloadUrl: file.download_url,
                        sha: file.sha,
                        month: parsed.month,
                        nameInFile: parsed.nameInFile,
                        year: parsed.year
                    };
                })
                .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                });

            console.log(`加载了 ${this.images.length} 张图片`);
        } catch (error) {
            console.log('从 GitHub 加载图片失败:', error.message);
            this.images = [];
        }
    }

    parseFileName(fileName) {
        const match = fileName.match(/^(\d{4})(\d{2})-(.+)\.[^.]+$/);
        if (match) {
            return {
                year: parseInt(match[1]),
                month: parseInt(match[2]),
                nameInFile: match[3]
            };
        }
        return { year: null, month: null, nameInFile: fileName.replace(/\.[^.]+$/, '') };
    }

    async handleUpload(file) {
        if (!GITHUB_CONFIG.token) {
            this.showToast('请先设置 GitHub Token');
            this.showSettingsModal();
            return;
        }

        const preview = document.getElementById('uploadPreview');
        const placeholder = document.querySelector('.upload-placeholder');
        const status = document.getElementById('uploadStatus');

        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
        placeholder.style.display = 'none';

        status.textContent = '正在上传...';
        status.className = 'upload-status uploading';

        try {
            const base64 = await this.fileToBase64(file);
            const fileName = file.name;
            
            const existingFile = this.images.find(img => img.name === fileName);
            const body = {
                message: `Upload ${fileName}`,
                content: base64,
                branch: GITHUB_CONFIG.branch
            };

            if (existingFile) {
                body.sha = existingFile.sha;
            }

            await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.uploadsPath}/${fileName}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            status.textContent = '上传成功！';
            status.className = 'upload-status success';

            setTimeout(() => {
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
                status.textContent = '';
            }, 2000);

            await this.loadImagesFromGithub();
            this.renderGallery();
        } catch (error) {
            status.textContent = `上传失败: ${error.message}`;
            status.className = 'upload-status error';
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    render() {
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.month) === this.currentMonth);
        });
        this.renderGallery();
        this.updateTokenStatus();
    }

    renderGallery() {
        const grid = document.getElementById('galleryGrid');
        const emptyState = document.getElementById('emptyState');

        const filtered = this.images.filter(img => img.month === this.currentMonth);

        if (filtered.length === 0) {
            grid.innerHTML = '';
            grid.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        grid.innerHTML = filtered.map(img => `
            <div class="gallery-item" data-path="${img.path}">
                <img src="${img.downloadUrl}" alt="${img.nameInFile}" loading="lazy">
                <div class="gallery-item-info">${img.nameInFile}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                const image = this.images.find(img => img.path === path);
                if (image) {
                    this.showPreview(image.downloadUrl);
                }
            });
        });
    }

    renderAllMonths() {
        const container = document.getElementById('allMonthsContent');
        const grouped = {};

        this.images.forEach(img => {
            const key = `${img.year}-${img.month}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(img);
        });

        const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        if (sortedKeys.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="icon">📷</span><span>暂无图片</span></div>';
            return;
        }

        container.innerHTML = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const images = grouped[key];
            return `
                <div class="all-months-section">
                    <h3 class="all-months-title">${year}年${MONTH_NAMES[parseInt(month) - 1]}</h3>
                    <div class="all-months-grid">
                        ${images.map(img => `
                            <div class="gallery-item" data-path="${img.path}">
                                <img src="${img.downloadUrl}" alt="${img.nameInFile}" loading="lazy">
                                <div class="gallery-item-info">${img.nameInFile}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                const image = this.images.find(img => img.path === path);
                if (image) {
                    this.showPreview(image.downloadUrl);
                }
            });
        });
    }

    showPreview(url) {
        document.getElementById('previewImage').src = url;
        document.getElementById('modalPreview').classList.add('active');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

new CultureWall();