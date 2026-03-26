const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const MONTH_STORIES = {
    1: { title: '开门红', story: '新年伊始，部门全员冲刺Q1目标，圆满完成各项任务指标，实现开门红。' },
    2: { title: '春节特辑', story: '春节期间值班团队坚守岗位，保障系统稳定运行，让全体员工安心过年。' },
    3: { title: '春暖花开', story: '阳春三月，部门组织户外拓展活动，增强团队凝聚力与协作能力。' },
    4: { title: '创新突破', story: '本月技术团队完成核心系统重构，性能提升300%，获得公司创新奖。' },
    5: { title: '劳动光荣', story: '五四青年节，部门青年员工占比超60%，是一支充满活力的年轻队伍。' },
    6: { title: '半年冲刺', story: '半年节点，部门全员奋战60天，确保半年度目标100%达成。' },
    7: { title: '夏日清凉', story: '夏日炎炎，人力资源部送来清凉福利，关怀每位员工的身心健康。' },
    8: { title: '技术深耕', story: '本月开展技术分享会12场，技术文档沉淀100+篇，知识传承持续进行。' },
    9: { title: '金秋收获', story: '秋季招聘圆满成功，引入5名高级人才，团队实力进一步增强。' },
    10: { title: '国庆献礼', story: '喜迎国庆，部门以优异成绩献礼祖国，营收同比增长40%。' },
    11: { title: '感恩有你', story: '感谢每一位同事的付出，部门为资深员工颁发荣誉勋章。' },
    12: { title: '年终总结', story: '全年目标超额完成120%，感谢每一位奋斗的伙伴，期待明年再创辉煌！' }
};

class CultureWall {
    constructor() {
        this.currentMonth = new Date().getMonth() + 1;
        this.currentYear = new Date().getFullYear();
        this.employees = this.loadEmployees();
        this.viewMode = 'monthly';
        this.filterMonth = null;
        this.maxPhotoSize = 300 * 1024; // 300KB per photo limit
        this.init();
    }

    init() {
        this.initParticles();
        this.bindEvents();
        this.render();
        this.updateYearMonth();
    }

    loadEmployees() {
        const stored = localStorage.getItem('cultureWallEmployees');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse employees data', e);
            }
        }
        return {};
    }

    saveEmployees() {
        localStorage.setItem('cultureWallEmployees', JSON.stringify(this.employees));
    }

    initParticles() {
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        let particles = [];
        const particleCount = 80;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.5 + 0.2;
                this.hue = Math.random() * 60 + 180;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.opacity})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) particles.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animate);
        };
        animate();
    }

    bindEvents() {
        document.getElementById('btnMonthly').addEventListener('click', () => this.setViewMode('monthly'));
        document.getElementById('btnOverview').addEventListener('click', () => this.setViewMode('overview'));
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMonth(parseInt(btn.dataset.month)));
        });
        document.getElementById('btnAddEmployee').addEventListener('click', () => this.showAddModal());
        document.getElementById('btnCloseModal').addEventListener('click', () => this.hideAddModal());
        document.getElementById('btnCancelAdd').addEventListener('click', () => this.hideAddModal());
        document.getElementById('btnConfirmAdd').addEventListener('click', () => this.addEmployee());
        document.getElementById('btnEditStory').addEventListener('click', () => this.showEditStoryModal());
        document.getElementById('btnCloseStoryModal').addEventListener('click', () => this.hideEditStoryModal());
        document.getElementById('btnCancelStory').addEventListener('click', () => this.hideEditStoryModal());
        document.getElementById('btnConfirmStory').addEventListener('click', () => this.saveStory());
        document.getElementById('btnFilterMonth').addEventListener('click', () => this.toggleFilter());
        document.getElementById('photoUpload').addEventListener('click', () => document.getElementById('inputPhoto').click());
        document.getElementById('inputPhoto').addEventListener('change', (e) => this.handlePhotoSelect(e));
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
        document.getElementById('btnOverview').classList.toggle('active', mode === 'overview');
        const employeesSection = document.getElementById('sectionEmployees');
        const allMonthsSection = document.getElementById('sectionAllMonths');
        if (mode === 'monthly') {
            employeesSection.style.display = 'block';
            allMonthsSection.style.display = 'none';
            this.filterMonth = null;
        } else {
            employeesSection.style.display = 'none';
            allMonthsSection.style.display = 'block';
            this.renderAllMonths();
        }
        this.updateFilterText();
    }

    selectMonth(month) {
        this.currentMonth = month;
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.month) === month);
        });
        document.getElementById('inputMonth').value = month;
        this.updateYearMonth();
        this.renderStory();
        this.renderEmployees();
    }

    updateYearMonth() {
        document.getElementById('currentYearMonth').textContent = `· ${this.currentYear}年${MONTH_NAMES[this.currentMonth - 1]}`;
    }

    render() {
        this.renderStory();
        this.renderEmployees();
    }

    renderStory() {
        const story = MONTH_STORIES[this.currentMonth] || { title: '', story: '' };
        document.getElementById('storyTitle').textContent = story.title;
        document.getElementById('storyContent').textContent = story.story;
    }

    renderEmployees() {
        const grid = document.getElementById('employeesGrid');
        const monthEmployees = this.getEmployeesByMonth(this.currentMonth);

        if (monthEmployees.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">👥</div>
                    <p>暂无员工信息</p>
                    <p>点击上方"添加员工"按钮添加</p>
                </div>`;
            return;
        }

        grid.innerHTML = monthEmployees.map((emp, index) => `
            <div class="employee-card" data-id="${emp.id}">
                <div class="employee-avatar">
                    ${emp.photo 
                        ? `<img src="${emp.photo}" alt="${emp.name}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder\\'>${emp.name.charAt(0)}</span>'">` 
                        : `<span class="placeholder">${emp.name.charAt(0)}</span>`
                    }
                </div>
                <div class="employee-name">${emp.name}</div>
                <div class="employee-actions">
                    <button class="btn-move" onclick="app.moveEmployee(${this.currentMonth}, ${index}, -1)" title="上移">↑</button>
                    <button class="btn-move" onclick="app.moveEmployee(${this.currentMonth}, ${index}, 1)" title="下移">↓</button>
                    <button class="btn-delete" onclick="app.deleteEmployee(${this.currentMonth}, ${index})" title="删除">🗑️</button>
                </div>
            </div>`).join('');
    }

    getEmployeesByMonth(month) { return this.employees[month] || []; }

    moveEmployee(month, index, direction) {
        const employees = this.employees[month] || [];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= employees.length) return;
        [employees[index], employees[newIndex]] = [employees[newIndex], employees[index]];
        this.employees[month] = employees;
        this.saveEmployees();
        this.renderEmployees();
        this.showToast('位置已调整');
    }

    deleteEmployee(month, index) {
        if (!confirm('确定要删除这位员工吗？')) return;
        const employees = this.employees[month] || [];
        employees.splice(index, 1);
        this.employees[month] = employees;
        this.saveEmployees();
        this.renderEmployees();
        this.showToast('员工已删除');
    }

    showAddModal() {
        document.getElementById('modalAddEmployee').classList.add('active');
        document.getElementById('inputName').value = '';
        document.getElementById('inputMonth').value = this.currentMonth;
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('photoPlaceholder').style.display = 'flex';
        document.getElementById('photoSizeWarning').textContent = '';
        this.selectedPhotoDataUrl = null;
        this.selectedPhotoFile = null;
    }

    hideAddModal() {
        document.getElementById('modalAddEmployee').classList.remove('active');
    }

    handlePhotoSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let dataUrl = event.target.result;
            
            // 如果超过限制，压缩图片
            if (file.size > this.maxPhotoSize) {
                dataUrl = this.compressImage(dataUrl, file.type);
                document.getElementById('photoSizeWarning').textContent = '⚠️ 图片已压缩';
            } else {
                document.getElementById('photoSizeWarning').textContent = '✓ 原始图片';
            }

            this.selectedPhotoDataUrl = dataUrl;
            const preview = document.getElementById('photoPreview');
            preview.src = dataUrl;
            preview.style.display = 'block';
            document.getElementById('photoPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    compressImage(dataUrl, mimeType) {
        const img = new Image();
        img.src = dataUrl;
        
        const canvas = document.createElement('canvas');
        const maxW = 400;
        let w = img.width;
        let h = img.height;
        
        if (w > maxW) {
            h = (h * maxW) / w;
            w = maxW;
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        
        let quality = 0.8;
        let result = canvas.toDataURL(mimeType, quality);
        
        // 逐步降低质量直到小于限制
        while (result.length * 0.75 > this.maxPhotoSize && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL(mimeType, quality);
        }
        
        return result;
    }

    addEmployee() {
        const name = document.getElementById('inputName').value.trim();
        const month = parseInt(document.getElementById('inputMonth').value);

        if (!name) { this.showToast('请输入员工姓名'); return; }
        if (!this.employees[month]) this.employees[month] = [];

        const id = Date.now().toString();
        const employee = { id, name, photo: this.selectedPhotoDataUrl || null };

        this.employees[month].push(employee);
        this.saveEmployees();
        this.hideAddModal();
        this.renderEmployees();
        this.showToast(`${name} 已添加`);
    }

    showEditStoryModal() {
        document.getElementById('modalEditStory').classList.add('active');
        document.getElementById('inputStoryMonth').value = this.currentMonth;
        document.getElementById('inputStoryTitle').value = MONTH_STORIES[this.currentMonth]?.title || '';
        document.getElementById('inputStoryContent').value = MONTH_STORIES[this.currentMonth]?.story || '';
    }

    hideEditStoryModal() {
        document.getElementById('modalEditStory').classList.remove('active');
    }

    saveStory() {
        const month = parseInt(document.getElementById('inputStoryMonth').value);
        const title = document.getElementById('inputStoryTitle').value.trim();
        const story = document.getElementById('inputStoryContent').value.trim();
        MONTH_STORIES[month] = { title, story };
        this.hideEditStoryModal();
        if (month === this.currentMonth) this.renderStory();
        this.showToast('故事已保存');
    }

    toggleFilter() {
        this.filterMonth = this.filterMonth === null ? this.currentMonth : null;
        this.updateFilterText();
        this.renderAllMonths();
    }

    updateFilterText() {
        const filterText = document.getElementById('filterText');
        filterText.textContent = this.filterMonth === null ? '筛选全部月份' : `仅显示${MONTH_NAMES[this.filterMonth - 1]}`;
    }

    renderAllMonths() {
        const container = document.getElementById('allMonthsContent');
        const months = this.filterMonth !== null ? [this.filterMonth] : Array.from({length: 12}, (_, i) => i + 1);

        container.innerHTML = months.map(month => {
            const monthEmployees = this.getEmployeesByMonth(month);
            const story = MONTH_STORIES[month];
            return `
                <div class="month-section">
                    <h3 class="month-title">${MONTH_NAMES[month - 1]}</h3>
                    ${story ? `<div class="month-story-preview">${story.title}：${story.story}</div>` : ''}
                    <div class="employees-inline">
                        ${monthEmployees.length === 0 
                            ? '<p style="color: var(--text-secondary);">暂无员工</p>'
                            : monthEmployees.map(emp => `
                                <div class="employee-inline-card">
                                    <div class="avatar">
                                        ${emp.photo 
                                            ? `<img src="${emp.photo}" alt="${emp.name}" onerror="this.parentElement.innerHTML='${emp.name.charAt(0)}'">` 
                                            : emp.name.charAt(0)
                                        }
                                    </div>
                                    <span class="name">${emp.name}</span>
                                </div>`).join('')
                        }
                    </div>
                </div>`;
        }).join('');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
}

const app = new CultureWall();
