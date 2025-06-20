// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBoUhoRCkyH0QYioE7uqifarKUt4n-p6Zk",
    authDomain: "task-manager-d7f34.firebaseapp.com",
    databaseURL: "https://task-manager-d7f34-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "task-manager-d7f34",
    storageBucket: "task-manager-d7f34.firebasestorage.app",
    messagingSenderId: "93328518993",
    appId: "1:93328518993:web:989e563f2ff1049c122d70",
    measurementId: "G-SXSD33VCWQ"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Google sign in
const googleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
    .then((result) => {
        // console.log("User signed in:", result.user);
        const welcomeMessage = document.getElementById("userInfo")
        welcomeMessage.innerHTML = `Welcome ${result.user.displayName}!`;
        welcomeMessage.classList.add("lead");

        document.getElementById("logoutBtn").classList.remove("d-none");
        document.getElementById("taskForm").classList.remove("d-none");

        loadUserTasks(result.user.uid);
    })
    .catch((error) => {
        console.log("Error signing in:", error)
    })
}

const logout = () => {
    firebase.auth().signOut().then(() => {
        // console.log("User signed out");
        document.getElementById("logoutBtn").classList.add("d-none");
    })
}

// Load user tasks
const loadUserTasks = (userId) => {
    const userTaskRef = db.ref("tasks/" + userId); // User specific tasks
    const taskList = document.getElementById("taskList");
    
    userTaskRef.off(); // Detach any previous listeners

    userTaskRef.on("value", (snapshot) => {
        taskList.innerHTML = "";
        const tasks = snapshot.val();
        
        if (tasks) {
            Object.entries(tasks).forEach(([taskId, task]) => {
                const li = document.createElement("li");
                li.classList.add("list-group-item");
        
                //Due date span
                const dueSpan = document.createElement("span");
        
                if (task.dueDate) {
                    const today = new Date();
                    const due = new Date(task.dueDate);
                    const timeDiff = due - today;
                    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                    if (daysLeft > 0) {
                        dueSpan.className = "badge bg-info ms-2";
                        dueSpan.textContent = `Due in ${daysLeft} day(s)`;
                    } else if (daysLeft === 0) {
                        dueSpan.className = "badge bg-warning text-dark ms-2";
                        dueSpan.textContent = "Due today!";
                    } else {
                        dueSpan.className = "badge bg-danger ms-2";
                        dueSpan.textContent = "Overdue!";
                    }
                }
                
                //Buttons / Complete
                const completeBtn = document.createElement("button");
                completeBtn.textContent = "Complete";
                completeBtn.className = "btn btn-sm btn-success ms-2";
                completeBtn.onclick = () => completeTask(userId, taskId);
                
                //Task text span
                const taskText = document.createElement("span");
                taskText.classList.add("d-flex", "justify-content-between", "align-items-center");
                taskText.textContent = task.task;

                // Edit
                const editBtn = document.createElement("button");
                editBtn.textContent = "Edit";
                editBtn.className = "btn btn-sm btn-warning me-2";
                editBtn.onclick = () => {
                    openEditModal(taskId, task.task, task.dueDate);
                }

                // Delete
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete"
                deleteBtn.className = "btn btn-sm btn-danger me-2"
                deleteBtn.onclick = () => modalDeleteTask(userId, taskId)

                //Container for buttons
                const buttonContainer = document.createElement("div");
                buttonContainer.classList.add("d-flex","justify-content-around","mt-2");

                buttonContainer.appendChild(completeBtn);
                buttonContainer.appendChild(editBtn);
                buttonContainer.appendChild(deleteBtn);

                //Container for spans
                const contentDiv = document.createElement("div");
                contentDiv.classList.add("d-flex","flex-column","w-100");
                contentDiv.appendChild(taskText);
                if (task.dueDate) contentDiv.appendChild(dueSpan);

                //Wrapper for everything
                const wrapperDiv = document.createElement("div");
                wrapperDiv.classList.add("d-flex","flex-column");

                //Create card
                const card = document.createElement("div");
                card.classList.add("card","mb-3","shadow-sm");

                const cardBody = document.createElement("div");
                cardBody.classList.add("card-body");
                cardBody.appendChild(contentDiv);
                cardBody.appendChild(buttonContainer);
                card.appendChild(cardBody);
                taskList.appendChild(card);
    
            });
        }
    });
}

firebase.auth().onAuthStateChanged((user) => {
    const signInBtn = document.getElementById("sign-btn");
    const formSection = document.getElementById("form-section");
    const taskSection = document.getElementById("task-section");
    const archiveSection = document.getElementById("archive-section");
    const signMessage = document.getElementById("sign-message");
    const logoutBtn = document.getElementById("logoutBtn")
    if (user) {
        // console.log("User is logged in", user.uid);
        formSection.classList.remove("d-none");
        taskSection.classList.remove("d-none");
        archiveSection.classList.remove("d-none");
        signInBtn.classList.add("d-none")
        signMessage.classList.add("d-none");
        logoutBtn.classList.remove("d-none")
        loadUserTasks(user.uid);
        displayArchivedTasks(user.uid);
    } else {
        // console.log("No user is logged in");
        signInBtn.classList.remove("d-none")
        document.getElementById("userInfo").textContent = "";
        formSection.classList.add("d-none");
        taskSection.classList.add("d-none");
        archiveSection.classList.add("d-none");
        signMessage.classList.remove("d-none");
    }
})

// Get the form and task list elements
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const dateInput = document.getElementById("dateInput");
const taskList = document.getElementById("taskList");

// Add task to firebase
taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser; // detect user
    const task = taskInput.value.trim();
    const dueDate = dateInput.value; //yyyy-mm-dd
    if (task) {
        const newTaskRef = db.ref("tasks/" + user.uid).push();
        await newTaskRef.set ({
            task: task,
            dueDate: dueDate,
            completed: false,
            timestamp: Date.now()
        })
       taskInput.value = "";
    }
});


// Edit modal
let currentEditTaskId = null;
//Show modal and fill inputs
function openEditModal(taskId, taskText, taskDueDate) {
    currentEditTaskId = taskId;
    document.getElementById("editTaskText").value = taskText;
    document.getElementById("editDueDate").value = taskDueDate || "";

    //Show Bootstrap modal
    const modalElement = document.getElementById("editTaskModal");
    const editModal = new bootstrap.Modal(modalElement);
    editModal.show();

    //When closing
    editModal.hide();
}

    // Handle form submission
    document.getElementById("editTaskForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const newText = document.getElementById("editTaskText").value;
        const newDueDate = document.getElementById("editDueDate").value;

        const userId = firebase.auth().currentUser.uid;
        const taskRef = db.ref(`tasks/${userId}/${currentEditTaskId}`);

        taskRef.update({
            task: newText,
            dueDate: newDueDate || null
        }).then(() => {
            bootstrap.Modal.getInstance(document.getElementById("editTaskModal")).hide();
        }).catch((error) => {
            console.log("Error updating task:", error);
        })
    })

// Delete function modal
let taskToDelete = null;
function modalDeleteTask (userId, taskId) {
    taskToDelete = {userId, taskId};
    
    const modal = new bootstrap.Modal(document.getElementById("deleteConfirmModal"));
    modal.show();
}

//Handle delete action
const deleteButton = document.getElementById("confirmDeleteBtn");
deleteButton.addEventListener("click", () => {
    if (taskToDelete) {
        firebase.database().ref(`tasks/${taskToDelete.userId}/${taskToDelete.taskId}`).remove()
        .then(() => {
            taskToDelete = null;
            bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal")).hide();
        })
        .catch((error) => {
            console.error("Error deleting task:", error);
        })
    }
})
    
// Complete task function
    const completeTask = (userId, taskId) => {
        firebase.database().ref(`tasks/${userId}/${taskId}`).once("value", (snapshot) => {
            const taskData = snapshot.val();

            if (taskData) {
                const archivedTask = {
                    task: taskData.task,
                    dueDate: taskData.dueDate || null,
                    timestamp: Date.now(),
                };
                
                firebase.database().ref(`archived_tasks/${userId}/${taskId}`).set(archivedTask)
                .then(() => {
                    firebase.database().ref(`tasks/${userId}/${taskId}`).remove();
                    triggerConffeti();
                })
            }
        });
    }

//Display completed tasks
const displayArchivedTasks = (userId) => {
    const archivedRef = db.ref("archived_tasks/" + userId);
    const archivedList = document.getElementById("archiveList");
    archivedList.innerHTML = "";

    archivedRef.on("value", (snapshot) => {
        archivedList.innerHTML = "" // Truco para limpiar primero
        const data = snapshot.val();

        if (data) {
            Object.keys(data).forEach((taskId) => {
                const li = document.createElement("li");
                li.classList.add("list-group-item", "text-muted");
                
                const task = data[taskId];
                // console.log(task.task);

                //Task span
                const taskText = document.createElement("span");
                taskText.textContent = task.task;

                //Due date span
                const date = task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-GB")
                    : "";

                const dateSpan = document.createElement("span");
                dateSpan.textContent = date ? `Due: ${date}` : "";
                dateSpan.classList.add("text-muted","small","d-block","mt-1","fst-italic","opacity-75");

                //Text div
                const taskInfo = document.createElement("div");
                taskInfo.appendChild(taskText);
                taskInfo.appendChild(dateSpan);

                //Unmark button
                const btnDiv = document.createElement("div");
                btnDiv.classList.add("d-flex", "justify-content-end", "mt-2");

                const unarchiveBtn = document.createElement("button");
                unarchiveBtn.textContent = "Unarchive";
                unarchiveBtn.classList.add("btn","btn-sm","btn-secondary");
                unarchiveBtn.onclick = () => unarchiveTask(userId, taskId, task.task, task.dueDate);

                btnDiv.appendChild(unarchiveBtn);

                //Create card
                const card = document.createElement("div");
                card.classList.add("card","mb-3","shadow-sm");
                const cardBody = document.createElement("div");
                cardBody.classList.add("card-body");

                cardBody.appendChild(taskInfo);
                cardBody.appendChild(btnDiv);
                card.appendChild(cardBody);
                archivedList.appendChild(card);
            });
        } else {
            archivedList.innerHTML = `<li class="list-group-item text-muted"> No archived tasks</li>`;
        }
    })
}

// Unmark task
function unarchiveTask (userId, taskId) {
    const archivedRef = db.ref(`archived_tasks/${userId}/${taskId}`);
    const activeRef = db.ref(`tasks/${userId}/${taskId}`);

    archivedRef.once("value").then((snapshot) => {
        const taskData = snapshot.val();

        if (taskData) {
            return activeRef.set(taskData).then(() => {
                return archivedRef.remove();
            })
        }
    }) .catch ((error) => {
        console.log("Error unarchiving task:", error);
    })
}

const triggerConffeti = () => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: {y: 0.6},
    })
}