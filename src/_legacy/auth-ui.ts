/**
 * Auth UI — Login/signup modal and header user menu.
 * Only rendered when Supabase is configured (online mode).
 */
import { signIn, signUp, signOut, getUser, onAuthChange, isAllowedDomain, resetPassword } from './auth';
import { isSupabaseConfigured } from './supabase';

type AuthView = 'login' | 'signup' | 'forgot';
let currentView: AuthView = 'login';

/** Initialize auth UI — call once on app startup */
export async function initAuthUI() {
    if (!isSupabaseConfigured()) return;

    // Listen for auth changes
    onAuthChange((_event, session) => {
        if (session) {
            hideAuthModal();
            renderUserMenu(session.user.email || '');
        } else {
            clearUserMenu();
            showAuthModal();
        }
    });

    // Check initial state
    const user = await getUser();
    if (user) {
        renderUserMenu(user.email || '');
    } else {
        showAuthModal();
    }
}

/** Show the auth modal overlay */
export function showAuthModal() {
    let modal = document.getElementById('auth-modal');
    if (!modal) return;
    currentView = 'login';
    modal.innerHTML = buildModalHTML();
    modal.style.display = 'flex';
    bindModalEvents();
}

/** Hide the auth modal */
export function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

/** Render user menu in header */
function renderUserMenu(email: string) {
    const container = document.getElementById('user-menu');
    if (!container) return;

    const displayName = email.split('@')[0];
    container.innerHTML = `
        <div class="user-menu-widget">
            <div class="user-avatar">${displayName.charAt(0).toUpperCase()}</div>
            <span class="user-email">${displayName}</span>
            <button id="btn-logout" class="user-logout-btn" title="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
        </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await signOut();
        clearUserMenu();
        showAuthModal();
    });
}

/** Clear user menu */
function clearUserMenu() {
    const container = document.getElementById('user-menu');
    if (container) container.innerHTML = '';
}

/** Build modal HTML */
function buildModalHTML(): string {
    if (currentView === 'forgot') {
        return `
            <div class="auth-card">
                <div class="auth-logo">LIVE <span class="accent">ASSET</span></div>
                <h2 class="auth-title">Reset Password</h2>
                <p class="auth-subtitle">Enter your VNG email to receive a reset link</p>
                <div id="auth-error" class="auth-error hidden"></div>
                <div id="auth-success" class="auth-success hidden"></div>
                <form id="auth-form" class="auth-form">
                    <input type="email" id="auth-email" placeholder="email@vng.com.vn" required autocomplete="email" />
                    <button type="submit" id="auth-submit" class="auth-submit">Send Reset Link</button>
                </form>
                <div class="auth-switch">
                    <a href="#" id="auth-to-login">Back to Sign In</a>
                </div>
            </div>
        `;
    }

    const isLogin = currentView === 'login';
    return `
        <div class="auth-card">
            <div class="auth-logo">LIVE <span class="accent">ASSET</span></div>
            <h2 class="auth-title">${isLogin ? 'Sign In' : 'Create Account'}</h2>
            <p class="auth-subtitle">${isLogin ? 'Sign in with your VNG email' : 'Register with your @vng.com.vn email'}</p>
            <div id="auth-error" class="auth-error hidden"></div>
            <form id="auth-form" class="auth-form">
                <input type="email" id="auth-email" placeholder="email@vng.com.vn" required autocomplete="email" />
                <input type="password" id="auth-password" placeholder="Password" required minlength="6" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
                <button type="submit" id="auth-submit" class="auth-submit">${isLogin ? 'Sign In' : 'Sign Up'}</button>
            </form>
            <div class="auth-switch">
                ${isLogin
                    ? `Don't have an account? <a href="#" id="auth-to-signup">Sign Up</a> &middot; <a href="#" id="auth-to-forgot">Forgot password?</a>`
                    : `Already have an account? <a href="#" id="auth-to-login">Sign In</a>`
                }
            </div>
        </div>
    `;
}

/** Bind events to modal elements */
function bindModalEvents() {
    const form = document.getElementById('auth-form') as HTMLFormElement;
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim();
        const password = (document.getElementById('auth-password') as HTMLInputElement)?.value;
        const submitBtn = document.getElementById('auth-submit') as HTMLButtonElement;

        if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }
        if (successEl) { successEl.classList.add('hidden'); successEl.textContent = ''; }

        if (!isAllowedDomain(email)) {
            showError('Only @vng.com.vn emails are allowed');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        try {
            if (currentView === 'forgot') {
                const { error } = await resetPassword(email);
                if (error) { showError(error); }
                else if (successEl) {
                    successEl.textContent = 'Reset link sent! Check your email.';
                    successEl.classList.remove('hidden');
                }
            } else if (currentView === 'login') {
                const { error } = await signIn(email, password);
                if (error) showError(error);
            } else {
                const { error } = await signUp(email, password);
                if (error) showError(error);
                else if (successEl) {
                    successEl.textContent = 'Account created! Check your email to confirm.';
                    successEl.classList.remove('hidden');
                }
            }
        } catch (err) {
            showError('An unexpected error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = currentView === 'login' ? 'Sign In' : currentView === 'signup' ? 'Sign Up' : 'Send Reset Link';
        }
    });

    document.getElementById('auth-to-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'signup';
        refreshModal();
    });

    document.getElementById('auth-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'login';
        refreshModal();
    });

    document.getElementById('auth-to-forgot')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'forgot';
        refreshModal();
    });
}

function refreshModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.innerHTML = buildModalHTML();
        bindModalEvents();
    }
}

function showError(msg: string) {
    const el = document.getElementById('auth-error');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}
