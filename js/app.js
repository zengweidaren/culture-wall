const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const GITHUB_CONFIG = {
    owner: 'zengweidaren',
    repo: 'culture-wall',
    branch: 'master',
    rawBase: 'https://raw.githubusercontent.com/zengweidaren/culture-wall/master'
};

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
        await this.loadImagesFromJson();
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

        document.getElementById('btnClosePreview').addEventListener('click', () => {
            document.getElementById('modalPreview').classList.remove('active');
        });
        document.getElementById('modalPreview').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('modalPreview').classList.remove('active');
            }
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
        document.getElementById('btnOverview').classList.toggle('active', mode === 'overview');
        document.getElementById('monthSelector').style.display = mode === 'monthly' ? 'block' : 'none';
        document.getElementById('sectionGallery').style.display = mode === 'monthly' ? 'block' : 'none';
        document.getElementById('sectionAllMonths').style.display = mode === 'overview' ? 'block' : 'none';
        
        if (mode === 'overview') {
            this.renderAllMonths();
        } else {
            this.renderGallery();
        }
    }

    async loadImagesFromJson() {
        try {
            const response = await fetch(`${GITHUB_CONFIG.rawBase}/data/images.json`);
            if (!response.ok) {
                throw new Error('images.json not found');
            }
            const data = await response.json();
            this.images = data.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
            console.log(`加载了 ${this.images.length} 张图片`);
        } catch (error) {
            console.log('加载 images.json 失败:', error.message);
            this.images = [];
        }
    }

    render() {
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.month) === this.currentMonth);
        });
        this.renderGallery();
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
            <div class="gallery-item" data-download-url="${img.downloadUrl}">
                <img src="${img.downloadUrl}" alt="${img.name}" loading="lazy">
                <div class="gallery-item-info">${img.name.replace(/\.[^.]+$/, '')}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showPreview(item.dataset.downloadUrl);
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
                            <div class="gallery-item" data-download-url="${img.downloadUrl}">
                                <img src="${img.downloadUrl}" alt="${img.name}" loading="lazy">
                                <div class="gallery-item-info">${img.name.replace(/\.[^.]+$/, '')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showPreview(item.dataset.downloadUrl);
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