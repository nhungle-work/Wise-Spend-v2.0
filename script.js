document.addEventListener('DOMContentLoaded', () => {
    // Set today's date in date input
    const todayInput = document.getElementById('today-date');
    if (todayInput) {
        const today = new Date().toISOString().split('T')[0];
        todayInput.value = today;
    }

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all sections
            viewSections.forEach(section => {
                section.classList.remove('active');
            });

            // Show target section
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Form Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    // For this prototype, we just highlight the active tab without changing much form content,
    // to keep it simple. But we'll change the button colors.
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Change primary color based on tab for a dynamic feel
            const root = document.documentElement;
            const tabName = btn.getAttribute('data-tab');
            
            if (tabName === 'thu') {
                root.style.setProperty('--primary', '#10b981');
                root.style.setProperty('--primary-hover', '#059669');
            } else if (tabName === 'chi') {
                root.style.setProperty('--primary', '#ef4444');
                root.style.setProperty('--primary-hover', '#dc2626');
            } else if (tabName === 'tiet-kiem') {
                root.style.setProperty('--primary', '#3b82f6');
                root.style.setProperty('--primary-hover', '#2563eb');
            } else if (tabName === 'dau-tu') {
                root.style.setProperty('--primary', '#f59e0b');
                root.style.setProperty('--primary-hover', '#d97706');
            } else {
                root.style.setProperty('--primary', '#8b5cf6');
                root.style.setProperty('--primary-hover', '#7c3aed');
            }
        });
    });

    // Amount input formatting (adds commas)
    const amountInput = document.querySelector('.amount-input');
    if (amountInput) {
        amountInput.addEventListener('input', (e) => {
            // Remove non-numeric chars
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val) {
                // Add commas
                val = parseInt(val, 10).toLocaleString('en-US');
                e.target.value = val;
            } else {
                e.target.value = '';
            }
        });
    }
});

// Toast notification logic
function showFeedback() {
    const toast = document.getElementById('feedback-toast');
    const amountInput = document.querySelector('.amount-input');
    const categorySelect = document.querySelector('.styled-select');
    const typeTab = document.querySelector('.tab-btn.active').innerText;
    
    let amount = amountInput.value || "0";
    let category = categorySelect.options[categorySelect.selectedIndex].text;
    
    // Update toast content based on input
    const toastTitle = toast.querySelector('h4');
    const toastDesc = toast.querySelector('p');
    
    toastTitle.textContent = `Đã lưu giao dịch ${typeTab}`;
    toastDesc.textContent = `${amount}₫ — ${category}. Đã lưu thành công vào Google Sheet.`;
    
    // Show toast
    toast.classList.add('show');
    
    // Reset form field
    amountInput.value = '';
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
