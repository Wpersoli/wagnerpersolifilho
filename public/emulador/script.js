'use strict';

const DeviceDatabase = {
    smartphones: [
        { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
        { name: 'iPhone 16 Pro', width: 402, height: 874 },
        { name: 'Galaxy S24 Ultra', width: 412, height: 915 },
        { name: 'Pixel 8 Pro', width: 412, height: 892 }
    ],
    tablets: [
        { name: 'iPad Pro 13"', width: 1024, height: 1366 },
        { name: 'Galaxy Tab S9', width: 800, height: 1280 }
    ],
    laptops: [
        { name: 'MacBook Pro 16"', width: 1728, height: 1117 },
        { name: 'Laptop HD', width: 1366, height: 768 }
    ],
    desktops: [
        { name: 'Full HD', width: 1920, height: 1080 },
        { name: '2K QHD', width: 2560, height: 1440 }
    ]
};

const Utils = {
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    validateURL(url) {
        if (!url || /\s/.test(url)) return false;

        try {
            const parsed = new URL(url);
            var localHttp = parsed.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(parsed.hostname);
            return (parsed.protocol === 'https:' || localHttp) && Boolean(parsed.hostname);
        } catch {
            return false;
        }
    },

    normalizeURL(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    }
};

class App {
    constructor() {
        this.state = {
            currentDevice: DeviceDatabase.smartphones[0],
            zoom: 100,
            rotated: false,
            dropdownOpen: false
        };

        this.loadTimeout = null;

        this.cacheDOM();
        this.renderDevices();
        this.bindEvents();
        this.updateDevice();
    }

    cacheDOM() {
        this.dom = {
            urlInput: document.getElementById('urlInput'),
            loadBtn: document.getElementById('loadBtn'),
            previewFrame: document.getElementById('previewFrame'),
            loading: document.getElementById('loading'),
            deviceScreen: document.getElementById('deviceScreen'),
            deviceFrame: document.getElementById('deviceFrame'),
            deviceInfo: document.getElementById('deviceInfo'),
            deviceToggle: document.getElementById('deviceToggle'),
            deviceDropdown: document.getElementById('deviceDropdown'),
            searchDevice: document.getElementById('searchDevice'),
            zoomIn: document.getElementById('zoomIn'),
            zoomOut: document.getElementById('zoomOut'),
            zoomValue: document.getElementById('zoomValue'),
            resetZoom: document.getElementById('resetZoom'),
            rotateBtn: document.getElementById('rotateBtn'),
            customWidth: document.getElementById('customWidth'),
            customHeight: document.getElementById('customHeight'),
            applyCustom: document.getElementById('applyCustom'),
            closeDropdown: document.getElementById('closeDropdown')
        };
    }

    renderDevices() {
        Object.entries(DeviceDatabase).forEach(([category, devices]) => {
            const container = document.getElementById(category);
            if (!container) return;

            devices.forEach((device) => {
                const item = document.createElement('div');
                item.className = 'device-item';

                item.innerHTML = `
                    <strong>${device.name}</strong>
                    <small>${device.width}×${device.height}</small>
                `;

                item.addEventListener('click', () => {
                    this.state.currentDevice = device;
                    this.state.rotated = false;

                    document.querySelectorAll('.device-item')
                        .forEach(el => el.classList.remove('active'));

                    item.classList.add('active');

                    this.updateDevice();
                    this.toggleDropdown(false);
                });

                container.appendChild(item);
            });
        });

        document.querySelector('.device-item')?.classList.add('active');
    }

    updateDevice() {
        const { currentDevice, rotated, zoom } = this.state;

        let width = rotated ? currentDevice.height : currentDevice.width;
        let height = rotated ? currentDevice.width : currentDevice.height;

        const stage = document.querySelector('.device-stage');

        const scale = Math.min(
            (stage.clientWidth - 100) / width,
            (stage.clientHeight - 100) / height,
            1
        ) * (zoom / 100);

        this.dom.deviceScreen.style.width = `${width}px`;
        this.dom.deviceScreen.style.height = `${height}px`;
        this.dom.deviceFrame.style.transform = `scale(${scale})`;

        this.dom.deviceInfo.textContent =
            `${currentDevice.name} • ${width}×${height}`;

        document.getElementById('toggleText').textContent = currentDevice.name;
        this.dom.zoomValue.textContent = `${zoom}%`;
    }

    loadURL() {
        let url = this.dom.urlInput.value.trim();

        if (!url) return;

        url = Utils.normalizeURL(url);

        if (!Utils.validateURL(url)) {
            this.showMessage('URL inválida');
            return;
        }

        this.showLoading();
        this.dom.previewFrame.removeAttribute('srcdoc');
        this.dom.previewFrame.src = url;

        clearTimeout(this.loadTimeout);

        this.loadTimeout = setTimeout(() => {
            this.showMessage('Site bloqueou iframe ou demorou para carregar.');
        }, 8000);

        this.dom.previewFrame.onload = () => {
            clearTimeout(this.loadTimeout);
            this.hideLoading();
        };
    }

    showLoading() {
        this.dom.loading.innerHTML = `
            <div class="spinner"></div>
            <p>Carregando...</p>
        `;
        this.dom.loading.style.display = 'flex';
        this.dom.previewFrame.style.display = 'none';
    }

    hideLoading() {
        this.dom.loading.style.display = 'none';
        this.dom.previewFrame.style.display = 'block';
    }

    showMessage(msg) {
        this.dom.loading.textContent = '';
        var p = document.createElement('p');
        p.textContent = msg;
        this.dom.loading.appendChild(p);
        this.dom.loading.style.display = 'flex';
        this.dom.previewFrame.style.display = 'none';
    }

    toggleDropdown(force = null) {
        this.state.dropdownOpen =
            force !== null ? force : !this.state.dropdownOpen;

        this.dom.deviceDropdown.style.display =
            this.state.dropdownOpen ? 'block' : 'none';
    }

    bindEvents() {
        this.dom.loadBtn.addEventListener('click', () => this.loadURL());

        this.dom.urlInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.loadURL();
        });

        this.dom.rotateBtn.addEventListener('click', () => {
            this.state.rotated = !this.state.rotated;
            this.updateDevice();
        });

        this.dom.zoomIn.addEventListener('click', () => {
            this.state.zoom = Math.min(this.state.zoom + 5, 200);
            this.updateDevice();
        });

        this.dom.zoomOut.addEventListener('click', () => {
            this.state.zoom = Math.max(this.state.zoom - 5, 30);
            this.updateDevice();
        });

        this.dom.resetZoom.addEventListener('click', () => {
            this.state.zoom = 100;
            this.updateDevice();
        });

        this.dom.deviceToggle.addEventListener('click', () => {
            this.toggleDropdown();
        });

        this.dom.closeDropdown.addEventListener('click', () => {
            this.toggleDropdown(false);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.toggleDropdown(false);
            }
        });

        this.dom.searchDevice.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();

            document.querySelectorAll('.device-item').forEach(item => {
                item.style.display =
                    item.textContent.toLowerCase().includes(q)
                        ? 'block'
                        : 'none';
            });
        });

        this.dom.applyCustom.addEventListener('click', () => {
            const width = Number.parseInt(this.dom.customWidth.value, 10);
            const height = Number.parseInt(this.dom.customHeight.value, 10);

            if (Number.isFinite(width) && Number.isFinite(height) && width >= 240 && width <= 3840 && height >= 320 && height <= 4320) {
                this.state.currentDevice = {
                    name: 'CUSTOM',
                    width,
                    height
                };
                this.state.rotated = false;

                this.updateDevice();
                this.toggleDropdown(false);
            }
        });

        window.addEventListener(
            'resize',
            Utils.debounce(() => this.updateDevice(), 250)
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
