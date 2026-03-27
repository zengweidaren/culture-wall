const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const GITHUB_CONFIG = {
    owner: 'zengweidaren',
    repo: 'culture-wall',
    branch: 'master',
    token: localStorage.getItem('githubToken') || '',
    apiBase: 'https://api.github.com'
};

if (!GITHUB_CONFIG.token) {
    console.warn('GitHub Token 未配置 图片上传功能不可用。请在浏览器控制台设置: localStorage.setItem("githubToken", "your_token")');
}

const MONTH_STORIES_KEY = 'cultureWallStories';

const MONTH_STORIES_DEFAULT = {
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
        this.employees = {};
        this.monthStories = this.loadStories();
        this.viewMode = 'monthly';
        this.filterMonth = null;
        this.dataLoaded = false;
        
        this.init();
    }

    async init() {
        this.initParticles();
        this.bindEvents();
        await this.loadEmployeesFromGithub();
        this.dataLoaded = true;
        this.render();
        this.updateYearMonth();
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

    async getFileSha(path) {
        try {
            const data = await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`);
            return data.sha;
        } catch (error) {
            return null;
        }
    }

    async uploadToGithub(fileName, base64Content) {
        const path = `uploads/${fileName}`;
        const sha = await this.getFileSha(path);
        
        const body = {
            message: `Upload ${fileName}`,
            content: base64Content,
            branch: GITHUB_CONFIG.branch
        };
        
        if (sha) {
            body.sha = sha;
        }

        const data = await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        return data.content?.download_url || `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${path}`;
    }

    async deleteFromGithub(fileName) {
        const path = `uploads/${fileName}`;
        const sha = await this.getFileSha(path);
        
        if (!sha) {
            return true;
        }

        await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
            method: 'DELETE',
            body: JSON.stringify({
                message: `Delete ${fileName}`,
                sha: sha,
                branch: GITHUB_CONFIG.branch
            })
        });

        return true;
    }

    async loadEmployeesFromGithub() {
        try {
            const data = await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/data/employees.json?ref=${GITHUB_CONFIG.branch}`);
            const content = atob(data.content);
            this.employees = JSON.parse(content);
            return;
        } catch (error) {
            console.log('员工数据文件不存在或加载失败，使用空数据');
        }
        this.employees = {};
    }

    async saveEmployeesToGithub() {
        if (!GITHUB_CONFIG.token) {
            console.warn('Token 未配置，无法保存到 GitHub');
            return false;
        }

        try {
            const content = JSON.stringify(this.employees, null, 2);
            const base64Content = btoa(unescape(encodeURIComponent(content)));
            const path = 'data/employees.json';
            const sha = await this.getFileSha(path);
            
            const body = {
                message: 'Update employees data',
                content: base64Content,
                branch: GITHUB_CONFIG.branch
            };
            
            if (sha) {
                body.sha = sha;
            }

            await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            localStorage.setItem('cultureWallEmployees', JSON.stringify(this.employees));
            return true;
        } catch (error) {
            console.error('保存员工数据到 GitHub 失败:', error);
            localStorage.setItem('cultureWallEmployees', JSON.stringify(this.employees));
            return false;
        }
    }

    loadEmployees() {
        return this.employees;
    }

    saveEmployees() {
        this.saveEmployeesToGithub();
    }

    loadStories() {
        const stored = localStorage.getItem(MONTH_STORIES_KEY);
        if (stored) {
            try {
                return { ...MONTH_STORIES_DEFAULT, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Failed to parse stories', e);
            }
        }
        return { ...MONTH_STORIES_DEFAULT };
    }

    saveStories() {
        localStorage.setItem(MONTH_STORIES_KEY, JSON.stringify(this.monthStories));
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

    async getFileSha(path) {
        try {
            const data = await this.githubApi(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}?ref=${GITHUB_CONFIG.branch}`);
            return data.sha;
        } catch (error) {
            return null;
        }
    }

    async uploadPhoto(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64 = e.target.result.split(',')[1];
                    const fileName = `${this.currentYear}${String(this.currentMonth).padStart(2, '0')}-${name}.${file.name.split('.').pop()}`;
                    const url = await this.uploadToGithub(fileName, base64);
                    resolve({ fileName, url });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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
            constructor() {
                this.reset();
            }

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

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };

        animate();
    }

    bindEvents() {
        document.getElementById('btnMonthly').addEventListener('click', () => this.setViewMode('monthly'));
        document.getElementById('btnOverview').addEventListener('click', () => this.setViewMode('overview'));

        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const month = parseInt(btn.dataset.month);
                this.selectMonth(month);
            });
        });

        document.getElementById('btnAddEmployee').addEventListener('click', () => this.showAddModal());
        document.getElementById('btnCloseModal').addEventListener('click', () => this.hideAddModal());
        document.getElementById('btnCancelAdd').addEventListener('click', () => this.hideAddModal());
        document.getElementById('btnConfirmAdd').addEventListener('click', () => this.confirmAddEmployee());

        document.getElementById('btnEditStory').addEventListener('click', () => this.showEditStoryModal());
        document.getElementById('btnCloseStoryModal').addEventListener('click', () => this.hideEditStoryModal());
        document.getElementById('btnCancelStory').addEventListener('click', () => this.hideEditStoryModal());
        document.getElementById('btnConfirmStory').addEventListener('click', () => this.saveStory());

        document.getElementById('btnFilterMonth').addEventListener('click', () => this.toggleFilter());

        document.getElementById('photoUpload').addEventListener('click', () => {
            document.getElementById('inputPhoto').click();
        });

        document.getElementById('inputPhoto').addEventListener('change', (e) => this.handlePhotoSelect(e));

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        document.getElementById('btnSettings').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.hideSettingsModal());
        document.getElementById('btnSaveToken').addEventListener('click', () => this.saveGithubToken());
        document.getElementById('btnClearToken').addEventListener('click', () => this.clearGithubToken());
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

    updateTokenStatus() {
        const status = document.getElementById('tokenStatus');
        const token = localStorage.getItem('githubToken');
        if (token) {
            status.innerHTML = '<span style="color: #2ed573;">✓ Token 已配置</span>';
        } else {
            status.innerHTML = '<span style="color: #ff4757;">✗ Token 未配置，图片上传功能不可用</span>';
        }
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

    setViewMode(mode) {
        this.viewMode = mode;
        
        document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
        document.getElementById('btnOverview').classList.toggle('active', mode === 'overview');

        const monthSelector = document.getElementById('sectionStory');
        const employeesSection = document.getElementById('sectionEmployees');
        const allMonthsSection = document.getElementById('sectionAllMonths');

        if (mode === 'monthly') {
            monthSelector.style.display = 'block';
            employeesSection.style.display = 'block';
            allMonthsSection.style.display = 'none';
            this.filterMonth = null;
        } else {
            monthSelector.style.display = 'block';
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
        const yearMonth = document.getElementById('currentYearMonth');
        yearMonth.textContent = `· ${this.currentYear}年${MONTH_NAMES[this.currentMonth - 1]}`;
    }

    render() {
        this.renderStory();
        this.renderEmployees();
    }

    renderStory() {
        const story = this.monthStories[this.currentMonth] || { title: '', story: '' };
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
                </div>
            `;
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
            </div>
        `).join('');
    }

    getEmployeesByMonth(month) {
        return this.employees[month] || [];
    }

    moveEmployee(month, index, direction) {
        const employees = this.employees[month] || [];
        const newIndex = index + direction;
        
        if (newIndex < 0 || newIndex >= employees.length) return;
        
        const temp = employees[index];
        employees[index] = employees[newIndex];
        employees[newIndex] = temp;
        
        this.employees[month] = employees;
        this.saveEmployees();
        this.renderEmployees();
        this.showToast('位置已调整');
    }

    async deleteEmployee(month, index) {
        if (!confirm('确定要删除这位员工吗？图片也会从 GitHub 删除！')) return;
        
        const employees = this.employees[month] || [];
        const employee = employees[index];
        
        if (employee.photoName) {
            try {
                await this.deleteFromGithub(employee.photoName);
                this.showToast('正在删除图片...');
            } catch (error) {
                console.error('Delete image error:', error);
            }
        }
        
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
        this.selectedPhotoFile = null;
        this.pendingEmployeeName = null;
    }

    hideAddModal() {
        document.getElementById('modalAddEmployee').classList.remove('active');
    }

    handlePhotoSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.selectedPhotoFile = file;

        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('photoPreview');
            preview.src = event.target.result;
            preview.style.display = 'block';
            document.getElementById('photoPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    showAddModalWithName(name) {
        this.pendingEmployeeName = name;
        document.getElementById('modalAddEmployee').classList.add('active');
        document.getElementById('inputName').value = name;
        document.getElementById('inputName').disabled = true;
        document.getElementById('inputMonth').value = this.currentMonth;
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('photoPlaceholder').style.display = 'flex';
        this.selectedPhotoFile = null;
    }

    async confirmAddEmployee() {
        const name = document.getElementById('inputName').value.trim();
        const month = parseInt(document.getElementById('inputMonth').value);

        if (!name) {
            this.showToast('请输入员工姓名');
            return;
        }

        this.hideAddModal();

        let photoUrl = null;
        let photoName = null;

        if (this.selectedPhotoFile) {
            if (!GITHUB_CONFIG.token) {
                photoUrl = URL.createObjectURL(this.selectedPhotoFile);
                this.showToast('未配置 Token，图片仅本地预览');
            } else {
                this.showToast('正在上传图片...');
                try {
                    const ext = this.selectedPhotoFile.name.split('.').pop();
                    photoName = `${this.currentYear}${String(month).padStart(2, '0')}-${name}.${ext}`;
                    photoUrl = await this.uploadToGithub(photoName, await this.fileToBase64(this.selectedPhotoFile));
                    this.showToast('图片上传成功！');
                } catch (error) {
                    console.error('Upload error:', error);
                    photoUrl = URL.createObjectURL(this.selectedPhotoFile);
                    this.showToast('上传失败，图片仅本地预览');
                }
            }
        }

        if (!this.employees[month]) {
            this.employees[month] = [];
        }

        const id = Date.now().toString();
        const employee = {
            id,
            name,
            photo: photoUrl,
            photoName
        };

        this.employees[month].push(employee);
        this.saveEmployees();
        this.renderEmployees();
        this.showToast(`${name} 已添加`);
        
        document.getElementById('inputName').disabled = false;
        this.pendingEmployeeName = null;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showEditStoryModal() {
        document.getElementById('modalEditStory').classList.add('active');
        document.getElementById('inputStoryMonth').value = this.currentMonth;
        document.getElementById('inputStoryTitle').value = this.monthStories[this.currentMonth]?.title || '';
        document.getElementById('inputStoryContent').value = this.monthStories[this.currentMonth]?.story || '';
    }

    hideEditStoryModal() {
        document.getElementById('modalEditStory').classList.remove('active');
    }

    saveStory() {
        const month = parseInt(document.getElementById('inputStoryMonth').value);
        const title = document.getElementById('inputStoryTitle').value.trim();
        const story = document.getElementById('inputStoryContent').value.trim();

        this.monthStories[month] = { title, story };
        this.saveStories();
        this.hideEditStoryModal();
        
        if (month === this.currentMonth) {
            this.renderStory();
        }
        
        this.showToast('故事已保存');
    }

    toggleFilter() {
        if (this.filterMonth === null) {
            this.filterMonth = this.currentMonth;
        } else {
            this.filterMonth = null;
        }
        this.updateFilterText();
        this.renderAllMonths();
    }

    updateFilterText() {
        const filterText = document.getElementById('filterText');
        if (this.filterMonth === null) {
            filterText.textContent = '筛选全部月份';
        } else {
            filterText.textContent = `仅显示${MONTH_NAMES[this.filterMonth - 1]}`;
        }
    }

    renderAllMonths() {
        const container = document.getElementById('allMonthsContent');
        
        if (this.filterMonth !== null) {
            const monthEmployees = this.getEmployeesByMonth(this.filterMonth);
            const story = this.monthStories[this.filterMonth];
            
            container.innerHTML = `
                <div class="month-section">
                    <h3 class="month-title">${MONTH_NAMES[this.filterMonth - 1]}</h3>
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
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        for (let month = 1; month <= 12; month++) {
            const monthEmployees = this.getEmployeesByMonth(month);
            const story = this.monthStories[month];
            
            html += `
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
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

const app = new CultureWall();
