// Firebase 초기화 (Realtime Database 버전)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let todos = [];
let editingId = null;
let currentUserId = null;
let unsubscribe = null;

// DOM 요소
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');

console.log('Firebase 앱 초기화 완료');
console.log('Realtime Database:', db);

// 인증 상태 확인 및 할일 목록 가져오기
onAuthStateChanged(auth, async (user) => {
    console.log('인증 상태 변경 감지');
    
    if (user) {
        currentUserId = user.uid;
        console.log('기존 사용자 로그인:', currentUserId);
        console.log('사용자 정보:', user);
        loadTodosFromDatabase();
    } else {
        console.log('사용자 미로그인 상태, 익명 로그인 시도...');
        
        try {
            const result = await signInAnonymously(auth);
            currentUserId = result.user.uid;
            console.log('익명 사용자로 로그인 성공:', currentUserId);
            console.log('사용자 정보:', result.user);
            loadTodosFromDatabase();
        } catch (error) {
            console.error('익명 로그인 오류:', error);
            alert('로그인에 실패했습니다: ' + error.message);
        }
    }
});

// Realtime Database에서 할일 목록 가져오기
function loadTodosFromDatabase() {
    if (!currentUserId) {
        console.error('currentUserId가 설정되지 않았습니다');
        return;
    }
    
    try {
        console.log('=== Realtime Database에서 할일 목록 가져오기 시작 ===');
        console.log('사용자 ID:', currentUserId);
        console.log('경로: users/' + currentUserId + '/todos');
        
        // Realtime Database 참조 생성
        const todosRef = ref(db, 'users/' + currentUserId + '/todos');
        console.log('데이터베이스 참조:', todosRef.path);
        
        // 실시간 리스너 설정
        unsubscribe = onValue(todosRef, 
            (snapshot) => {
                console.log('=== Realtime Database 스냅샷 수신 ===');
                console.log('스냅샷 존재:', snapshot.exists());
                
                todos = [];
                
                if (!snapshot.exists()) {
                    console.log('할일이 없습니다');
                } else {
                    const data = snapshot.val();
                    console.log('데이터:', data);
                    
                    // 데이터를 배열로 변환
                    Object.keys(data).forEach((key) => {
                        const todoData = data[key];
                        console.log('할일 ID:', key);
                        console.log('할일 데이터:', todoData);
                        
                        const todoItem = {
                            id: key,
                            text: todoData.text || '',
                            completed: todoData.completed || false,
                            starred: todoData.starred || false,
                            createdAt: todoData.createdAt,
                            updatedAt: todoData.updatedAt
                        };
                        
                        console.log('할일 추가:', todoItem);
                        todos.unshift(todoItem); // 최신순 정렬
                    });
                }
                
                console.log('총 할일 수:', todos.length);
                console.log('전체 할일 목록:', todos);
                console.log('=== 할일 목록 업데이트 완료 ===');
                
                render();
            },
            (error) => {
                console.error('=== Realtime Database 리스너 오류 ===');
                console.error('오류 코드:', error.code);
                console.error('오류 메시지:', error.message);
                console.error('전체 오류:', error);
                
                if (error.code === 'PERMISSION_DENIED') {
                    alert('권한이 없습니다. Firebase Realtime Database 규칙을 확인해주세요.');
                } else {
                    alert('할일 목록을 불러올 수 없습니다: ' + error.message);
                }
            }
        );
        
        console.log('실시간 리스너 설정 완료');
        
    } catch (error) {
        console.error('=== 할일 목록 가져오기 오류 ===');
        console.error('오류:', error);
        alert('할일 목록을 가져올 수 없습니다: ' + error.message);
    }
}

// 이벤트 리스너
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 할일 추가
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        console.log('빈 할일은 추가할 수 없습니다.');
        return;
    }
    
    if (!currentUserId) {
        console.error('사용자 ID가 없습니다');
        alert('사용자 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    try {
        console.log('=== 할일 추가 시작 ===');
        console.log('할일 내용:', text);
        console.log('사용자 ID:', currentUserId);
        
        const newTodo = {
            text: text,
            completed: false,
            starred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log('추가할 할일:', newTodo);
        
        // Realtime Database에 데이터 추가
        const todosRef = ref(db, 'users/' + currentUserId + '/todos');
        const newTodoRef = await push(todosRef, newTodo);
        
        console.log('할일이 추가되었습니다');
        console.log('새 할일 ID:', newTodoRef.key);
        console.log('경로:', newTodoRef.path);
        console.log('=== 할일 추가 완료 ===');
        
        // 입력 필드 초기화
        todoInput.value = '';
        todoInput.focus();
        
    } catch (error) {
        console.error('=== 할일 추가 오류 ===');
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        console.error('전체 오류:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
            alert('권한이 없습니다. Firebase Realtime Database 규칙을 확인해주세요.');
        } else {
            alert('할일 추가에 실패했습니다: ' + error.message);
        }
    }
}

// 할일 삭제
async function deleteTodo(id) {
    if (confirm('정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        try {
            console.log('=== Realtime Database에서 할일 삭제 시작 ===');
            console.log('삭제할 할일 ID:', id);
            console.log('사용자 ID:', currentUserId);
            
            // 삭제할 할일 찾기
            const todoToDelete = todos.find(t => t.id === id);
            if (todoToDelete) {
                console.log('삭제할 할일 내용:', todoToDelete.text);
            }
            
            // Realtime Database에서 데이터 삭제
            const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
            console.log('삭제 경로:', todoRef.path);
            
            await remove(todoRef);
            
            console.log('✓ 할일이 Realtime Database에서 삭제되었습니다');
            console.log('삭제된 할일 ID:', id);
            
            // 로컬 배열에서도 제거
            todos = todos.filter(todo => todo.id !== id);
            console.log('로컬 할일 목록 업데이트 완료');
            console.log('남은 할일 수:', todos.length);
            
            render();
            console.log('=== Realtime Database 할일 삭제 완료 ===');
            
        } catch (error) {
            console.error('=== 할일 삭제 오류 ===');
            console.error('오류 코드:', error.code);
            console.error('오류 메시지:', error.message);
            console.error('전체 오류:', error);
            
            if (error.code === 'PERMISSION_DENIED') {
                alert('권한이 없습니다. Firebase Realtime Database 규칙을 확인해주세요.');
            } else {
                alert('할일 삭제에 실패했습니다: ' + error.message);
            }
        }
    }
}

// 할일 완료 토글
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        try {
            console.log('=== 할일 상태 변경 시작 ===');
            console.log('할일 ID:', id);
            console.log('현재 상태 - 완료:', todo.completed);
            console.log('새로운 상태 - 완료:', !todo.completed);
            
            const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
            await update(todoRef, {
                completed: !todo.completed,
                updatedAt: new Date().toISOString()
            });
            
            console.log('할일 상태가 변경되었습니다');
            console.log('=== 할일 상태 변경 완료 ===');
            
        } catch (error) {
            console.error('할일 업데이트 오류:', error);
            alert('할일 상태 변경에 실패했습니다: ' + error.message);
        }
    }
}

// 별 표시 토글
async function toggleStar(id, e) {
    e.stopPropagation();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        try {
            console.log('=== 별 표시 변경 시작 ===');
            console.log('할일 ID:', id);
            console.log('현재 별:', todo.starred);
            console.log('새로운 별:', !todo.starred);
            
            const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
            await update(todoRef, {
                starred: !todo.starred,
                updatedAt: new Date().toISOString()
            });
            
            console.log('별 표시가 변경되었습니다');
            console.log('=== 별 표시 변경 완료 ===');
            
        } catch (error) {
            console.error('별 표시 업데이트 오류:', error);
            alert('별 표시 변경에 실패했습니다: ' + error.message);
        }
    }
}

// 수정 모드 시작
function startEdit(id, e) {
    e.stopPropagation();
    console.log('=== 수정 모드 시작 ===');
    console.log('수정할 할일 ID:', id);
    
    const todoToEdit = todos.find(t => t.id === id);
    if (todoToEdit) {
        console.log('수정할 내용:', todoToEdit.text);
    }
    
    editingId = id;
    render();
    
    // 수정 입력 필드에 포커스 주기
    const editInput = document.getElementById(`edit-input-${id}`);
    if (editInput) {
        console.log('입력 필드 포커스 설정');
        editInput.focus();
        editInput.select();
    }
    
    console.log('=== 수정 모드 준비 완료 ===');
}

// 수정 완료
async function saveEdit(id, e) {
    e.stopPropagation();
    const editInput = document.getElementById(`edit-input-${id}`);
    const newText = editInput.value.trim();
    
    if (newText === '') {
        alert('할일을 입력해주세요.');
        editInput.focus();
        return;
    }
    
    try {
        console.log('=== Realtime Database에서 할일 수정 시작 ===');
        console.log('수정할 할일 ID:', id);
        console.log('사용자 ID:', currentUserId);
        
        // 수정 전 할일 정보 찾기
        const todoToUpdate = todos.find(t => t.id === id);
        if (todoToUpdate) {
            console.log('수정 전 내용:', todoToUpdate.text);
        }
        console.log('수정될 새로운 내용:', newText);
        
        // 저장 버튼 비활성화 (중복 클릭 방지)
        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
        }
        
        // Realtime Database에서 데이터 업데이트
        const todoRef = ref(db, 'users/' + currentUserId + '/todos/' + id);
        console.log('수정 경로:', todoRef.path);
        
        const updateData = {
            text: newText,
            updatedAt: new Date().toISOString()
        };
        console.log('업데이트 데이터:', updateData);
        
        await update(todoRef, updateData);
        
        console.log('✓ 할일이 Realtime Database에서 수정되었습니다');
        console.log('수정된 할일 ID:', id);
        console.log('새로운 내용:', newText);
        
        // 로컬 배열 업데이트
        const localTodo = todos.find(t => t.id === id);
        if (localTodo) {
            localTodo.text = newText;
            localTodo.updatedAt = new Date().toISOString();
            console.log('로컬 할일 업데이트 완료');
        }
        
        // 수정 모드 해제
        editingId = null;
        console.log('수정 모드 해제');
        console.log('=== Realtime Database 할일 수정 완료 ===');
        
        // UI 업데이트 및 일반 모드로 전환
        render();
        
        // 성공 피드백
        console.log('✓ 할일 수정이 완료되었습니다!');
        
    } catch (error) {
        console.error('=== 할일 수정 오류 ===');
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        console.error('전체 오류:', error);
        
        // 저장 버튼 다시 활성화
        const saveBtn = e.target.closest('.save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
        
        if (error.code === 'PERMISSION_DENIED') {
            alert('권한이 없습니다. Firebase Realtime Database 규칙을 확인해주세요.');
        } else {
            alert('할일 수정에 실패했습니다: ' + error.message);
        }
    }
}

// 수정 취소
function cancelEdit(e) {
    e.stopPropagation();
    console.log('=== 수정 취소 ===');
    console.log('수정 중인 할일 ID:', editingId);
    console.log('수정 모드 해제');
    
    editingId = null;
    render();
    
    console.log('=== 일반 모드로 복귀 완료 ===');
}

// 수정 모드에서 키보드 처리
function handleEditKeypress(e, id) {
    if (e.key === 'Enter') {
        saveEdit(id, e);
    } else if (e.key === 'Escape') {
        cancelEdit(e);
    }
}

// 할일 목록 렌더링
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
                    <input 
                        type="checkbox" 
                        class="checkbox" 
                        ${todo.completed ? 'checked' : ''}
                        disabled
                    >
                    <input 
                        type="text" 
                        id="edit-input-${todo.id}"
                        class="edit-input" 
                        value="${escapeHtml(todo.text)}"
                        placeholder="할일을 입력하세요..."
                    >
                    <div class="todo-actions">
                        <button class="save-btn" onclick="window.saveEdit('${todo.id}', event)" title="저장 (Enter)">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="cancel-btn" onclick="window.cancelEdit(event)" title="취소 (Esc)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                // 이벤트 리스너 추가
                const editInput = li.querySelector(`#edit-input-${todo.id}`);
                if (editInput) {
                    editInput.addEventListener('keypress', (e) => handleEditKeypress(e, todo.id));
                }
                
            } else {
                // 일반 모드
                li.innerHTML = `
                    <input 
                        type="checkbox" 
                        class="checkbox" 
                        ${todo.completed ? 'checked' : ''}
                        onchange="window.toggleTodo('${todo.id}')"
                        title="${todo.completed ? '미완료로 변경' : '완료로 변경'}"
                    >
                    <span class="todo-text" title="${escapeHtml(todo.text)}">${escapeHtml(todo.text)}</span>
                    <div class="todo-actions">
                        <button class="star-btn ${todo.starred ? 'active' : ''}" onclick="window.toggleStar('${todo.id}', event)" title="${todo.starred ? '별 제거' : '즐겨찾기'}">
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

// HTML 특수문자 이스케이프 (XSS 방지)
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

// 전역 함수로 내보내기 (HTML onclick에서 사용)
window.addTodo = addTodo;
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;
window.toggleStar = toggleStar;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;
window.handleEditKeypress = handleEditKeypress;

console.log('=== Firebase Realtime Database To Do 앱 로드 완료 ===');
console.log('콘솔에서 동작을 확인할 수 있습니다');