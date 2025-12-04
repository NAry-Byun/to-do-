// ==========================================
// Firebase Realtime Database To Do 앱
// ==========================================

// 1️⃣ Firebase 초기화 및 필수 함수 import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// 2️⃣ Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBxNKOgI09A06STwg8r1CdLT1fK0USIStE",
    authDomain: "todoapp-9ef1c.firebaseapp.com",
    projectId: "todoapp-9ef1c",
    storageBucket: "todoapp-9ef1c.firebasestorage.app",
    messagingSenderId: "826635381840",
    appId: "1:826635381840:web:3365d669810b4addde7555",
    measurementId: "G-STJGQ54QT0",
    databaseURL: "https://todoapp-9ef1c-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// 3️⃣ 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 4️⃣ 전역 변수
let todos = [];
let editingId = null;
let currentUserId = null;
let unsubscribe = null;

// 5️⃣ DOM 요소
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');

// ==========================================
// LocalStorage 함수 (데이터 유지)
// ==========================================

// 저장된 사용자 ID 가져오기
function getSavedUserId() {
    const savedId = localStorage.getItem('todoAppUserId');
    console.log('LocalStorage에서 저장된 사용자 ID:', savedId);
    return savedId;
}

// 사용자 ID 저장
function saveUserId(userId) {
    localStorage.setItem('todoAppUserId', userId);
    console.log('사용자 ID를 LocalStorage에 저장:', userId);
}

// ==========================================
// 인증 처리
// ==========================================

onAuthStateChanged(auth, async (user) => {
    console.log('인증 상태 변경 감지');
    
    const savedUserId = getSavedUserId();
    
    if (savedUserId) {
        console.log('기존 저장된 사용자 ID 사용:', savedUserId);
        currentUserId = savedUserId;
        loadTodosFromDatabase();
    } else if (user) {
        currentUserId = user.uid;
        saveUserId(currentUserId);
        console.log('기존 Firebase 사용자 로그인:', currentUserId);
        loadTodosFromDatabase();
    } else {
        console.log('새로운 익명 로그인 시도...');
        try {
            const result = await signInAnonymously(auth);
            currentUserId = result.user.uid;
            saveUserId(currentUserId);
            console.log('익명 사용자로 로그인 성공:', currentUserId);
            loadTodosFromDatabase();
        } catch (error) {
            console.error('익명 로그인 오류:', error);
            alert('로그인에 실패했습니다: ' + error.message);
        }
    }
});

// ==========================================
// Realtime Database 함수
// ==========================================

// 할일 목록 가져오기 (실시간 리스너)
function loadTodosFromDatabase() {
    if (!currentUserId) {
        console.error('currentUserId가 설정되지 않았습니다');
        return;
    }
    
    try {
        console.log('=== Realtime Database에서 할일 목록 가져오기 시작 ===');
        const todosRef = ref(db, 'users/' + currentUserId + '/todos');
        
        unsubscribe = onValue(todosRef, 
            (snapshot) => {
                console.log('=== Realtime Database 스냅샷 수신 ===');
                todos = [];
                
                if (!snapshot.exists()) {
                    console.log('할일이 없습니다');
                } else {
                    const data = snapshot.val();
                    Object.keys(data).forEach((key) => {
                        const todoData = data[key];
                        const todoItem = {
                            id: key,
                            text: todoData.text || '',
                            completed: todoData.completed || false,
                            starred: todoData.starred || false,
                            createdAt: todoData.createdAt,
                            updatedAt: todoData.updatedAt
                        };
                        todos.unshift(todoItem);
                    });
                }
                
                console.log('총 할일 수:', todos.length);
                render();
            },
            (error) => {
                console.error('=== Realtime Database 리스너 오류 ===', error);
                if (error.code === 'PERMISSION_DENIED') {
                    alert('권한이 없습니다. Firebase 규칙을 확인해주세요.');
                } else {
                    alert('할일 목록을 불러올 수 없습니다: ' + error.message);
                }
            }
        );
    } catch (error) {
        console.error('할일 목록 가져오기 오류:', error);
        alert('할일 목록을 가져올 수 없습니다: ' + error.message);
    }
}

// ==========================================
// CRUD 함수들
// ==========================================

// Enter 키로 할일 추가
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

// 할일 추가
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '' || !currentUserId) {
        console.log('빈 할일 또는 사용자 미확인');
        return;
    }
    
    try {
        console.log('=== 할일 추가 시작 ===');
        const newTodo = {
            text: text,
            completed: false,
            starred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const todosRef = ref(db, 'users/' + currentUserId + '/todos');
        await push(todosRef, newTodo);
        
        console.log('✓ 할일이 추가되었습니다');
        todoInput.value = '';
        todoInput.focus();
    } catch (error) {
        console.error('할일 추가 오류:', error);
        alert('할일 추가에 실패했습니다: ' + error.message);
    }
}

// 할일 삭제
async function deleteTodo(id) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    try {
        console.log('=== 할일 삭제 시작 ===');
        const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
        await remove(todoRef);
        
        todos = todos.filter(todo => todo.id !== id);
        console.log('✓ 할일이 삭제되었습니다');
        render();
    } catch (error) {
        console.error('할일 삭제 오류:', error);
        alert('할일 삭제에 실패했습니다: ' + error.message);
    }
}

// 완료 토글
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
        console.log('=== 할일 상태 변경 ===');
        const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
        await update(todoRef, {
            completed: !todo.completed,
            updatedAt: new Date().toISOString()
        });
        console.log('✓ 할일 상태가 변경되었습니다');
    } catch (error) {
        console.error('할일 업데이트 오류:', error);
        alert('할일 상태 변경에 실패했습니다: ' + error.message);
    }
}

// 별 표시 토글
async function toggleStar(id, e) {
    e.stopPropagation();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
        console.log('=== 별 표시 변경 ===');
        const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
        await update(todoRef, {
            starred: !todo.starred,
            updatedAt: new Date().toISOString()
        });
        console.log('✓ 별 표시가 변경되었습니다');
    } catch (error) {
        console.error('별 표시 업데이트 오류:', error);
        alert('별 표시 변경에 실패했습니다: ' + error.message);
    }
}

// 수정 모드 시작
function startEdit(id, e) {
    e.stopPropagation();
    console.log('=== 수정 모드 시작 ===');
    editingId = id;
    render();
    
    const editInput = document.getElementById(`edit-input-${id}`);
    if (editInput) {
        editInput.focus();
        editInput.select();
    }
}

// 수정 저장
async function saveEdit(id, e) {
    e.stopPropagation();
    const editInput = document.getElementById(`edit-input-${id}`);
    const newText = editInput.value.trim();
    
    if (!newText) {
        alert('할일을 입력해주세요.');
        return;
    }
    
    try {
        console.log('=== 할일 수정 ===');
        const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
        await update(todoRef, {
            text: newText,
            updatedAt: new Date().toISOString()
        });
        
        const localTodo = todos.find(t => t.id === id);
        if (localTodo) localTodo.text = newText;
        
        editingId = null;
        console.log('✓ 할일이 수정되었습니다');
        render();
    } catch (error) {
        console.error('할일 수정 오류:', error);
        alert('할일 수정에 실패했습니다: ' + error.message);
    }
}

// 수정 취소
function cancelEdit(e) {
    e.stopPropagation();
    console.log('=== 수정 취소 ===');
    editingId = null;
    render();
}

// 수정 중 키보드 처리
function handleEditKeypress(e, id) {
    if (e.key === 'Enter') saveEdit(id, e);
    else if (e.key === 'Escape') cancelEdit(e);
}

// ==========================================
// 렌더링 함수
// ==========================================

function render() {
    todoList.innerHTML = '';
    
    if (todos.length === 0) {
        todoList.innerHTML = '<div class="empty-message">할일을 추가해보세요.</div>';
    } else {
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            if (editingId === todo.id) {
                // 수정 모드
                li.innerHTML = `
                    <input type="checkbox" class="checkbox" ${todo.completed ? 'checked' : ''} disabled>
                    <input type="text" id="edit-input-${todo.id}" class="edit-input" 
                           value="${escapeHtml(todo.text)}" placeholder="할일을 입력하세요...">
                    <div class="todo-actions">
                        <button class="save-btn" onclick="window.saveEdit('${todo.id}', event)" title="저장 (Enter)">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="cancel-btn" onclick="window.cancelEdit(event)" title="취소 (Esc)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                const editInput = li.querySelector(`#edit-input-${todo.id}`);
                if (editInput) {
                    editInput.addEventListener('keypress', (e) => handleEditKeypress(e, todo.id));
                }
            } else {
                // 일반 모드
                li.innerHTML = `
                    <input type="checkbox" class="checkbox" ${todo.completed ? 'checked' : ''}
                           onchange="window.toggleTodo('${todo.id}')" title="${todo.completed ? '미완료' : '완료'}">
                    <span class="todo-text" title="${escapeHtml(todo.text)}">${escapeHtml(todo.text)}</span>
                    <div class="todo-actions">
                        <button class="star-btn ${todo.starred ? 'active' : ''}" onclick="window.toggleStar('${todo.id}', event)" 
                                title="${todo.starred ? '별 제거' : '즐겨찾기'}">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="edit-btn" onclick="window.startEdit('${todo.id}', event)" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="window.deleteTodo('${todo.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }
            
            todoList.appendChild(li);
        });
    }
}

// ==========================================
// 유틸리티 함수
// ==========================================

// XSS 방지 (HTML 특수문자 이스케이프)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 사용자 ID 표시
function updateUserIdDisplay() {
    const userIdDisplay = document.getElementById('userIdDisplay');
    if (userIdDisplay && currentUserId) {
        userIdDisplay.textContent = `사용자 ID: ${currentUserId.substring(0, 20)}...`;
        userIdDisplay.title = `전체 ID: ${currentUserId}`;
    }
}

// 데이터 초기화
document.getElementById('clearDataBtn')?.addEventListener('click', () => {
    if (confirm('⚠️ 모든 할일 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        console.log('=== 데이터 초기화 ===');
        localStorage.removeItem('todoAppUserId');
        currentUserId = null;
        console.log('✓ 데이터가 초기화되었습니다');
        location.reload();
    }
});

// ==========================================
// 전역 함수 내보내기 (HTML onclick 사용)
// ==========================================

window.addTodo = addTodo;
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;
window.toggleStar = toggleStar;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.handleEditKeypress = handleEditKeypress;

// 초기화 완료
setTimeout(() => updateUserIdDisplay(), 500);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateUserIdDisplay();
});

console.log('=== Firebase Realtime Database To Do 앱 로드 완료 ===');
console.log('💾 LocalStorage를 사용하여 사용자 ID가 자동으로 유지됩니다');