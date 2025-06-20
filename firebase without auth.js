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

//   {/* // Initialize Firebase */}
firebase.initializeApp(firebaseConfig);
//   const analytics = getAnalytics(app);
const db = firebase.database();
const auth = firebase.auth();

// Get the form and task list elements
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

// Add task to firebase
taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser; // detect user

    const task = taskInput.value.trim();
    if (task) {
        const newTaskRef = db.ref("tasks/" + user.uid).push();
        await newTaskRef.set ({
            task: task,
            completed: false,
            timestamp: Date.now()
        })
       taskInput.value = "";
    }
});

// Fetch and display tasks from Firebase
const displayTasks = () => {
    // const userTaskRef = db.ref("tasks/" + userId);
    db.ref("tasks/" + user.uid).on("value", (snapshot) => {
        taskList.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            const taskData = childSnapshot.val();
            const taskId = childSnapshot.key;

            const taskItem = document.createElement("li");
            taskItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
            taskItem.textContent = taskData.task;

            //Add delete
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("btn", "btn-danger", "btn-sm", "float-right");
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", async () => {
                await db.ref("tasks").child(taskId).remove();
            });

            //Task text
            const taskText = document.createElement("span");
            taskText.textContent = taskData.task;
            if (taskData.completed) {
                taskText.style.textDecoration = "line-through";
                taskText.style.color = "gray";
            }

            //Complete button 
            const completeBtn = document.createElement("button");
            completeBtn.classList.add("btn", "btn-success", "btn-sm", "ml-2");
            completeBtn.textContent = "Complete";
            completeBtn.onclick = () => completeTask(taskId);

            //Edit button
            const editBtn = document.createElement("button");
            editBtn.classList.add("btn", "btn-warning", "btn-sm", "ml-2");
            editBtn.textContent = "Edit";
            editBtn.onclick = () => editTask(taskId, taskText);

            //Container for buttons
            const buttonContainer = document.createElement("div");
            buttonContainer.classList.add("d-flex", "gap-2");

            buttonContainer.appendChild(completeBtn);
            buttonContainer.appendChild(editBtn);
            buttonContainer.appendChild(deleteBtn);

            taskList.appendChild(taskText);
            taskList.appendChild(buttonContainer);          
        });
    })
}

const editTask = (taskId, taskText) => {
    //Create an input field and pre-fill it with the current info
    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.value = taskText.textContent;
    inputField.classList.add("form-control", "mr-2");

    //Replace the task text with the input field
    taskText.replaceWith(inputField);
    inputField.focus();

    // Save changes when Enter is pressed or input loses focus
    inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            saveEditedTask(taskId, inputField.value, inputField);
        }
    });
    
    inputField.addEventListener("blur", () => {
        saveEditedTask(taskId, inputField.value, inputField);
    });
}

const saveEditedTask = (taskId, newTaskText, inputField) => {
    //Check if there is an error message and remove it
    let errorMessage = document.getElementById("error-message");
    if (!errorMessage) {
        errorMessage = document.createElement("small");
        errorMessage.id = "error-message";
        errorMessage.style.color = "red";
        inputField.parentElement.appendChild(errorMessage);
    }
    if (newTaskText.trim() === "") {
        errorMessage.textContent = "Task cannot be empty!";
        inputField.focus();
        return;
    }
    errorMessage.remove();
    //Update task in firebase
    firebase.database().ref("tasks/" + taskId).update({task: newTaskText});

    //Replace input field with updated task text
    const taskText = document.createElement("span");
    taskText.textContent = newTaskText;
    inputField.replaceWith(taskText);
}

const completeTask = (taskId) => {
    //firebase.database().ref("tasks/" + taskId).update({completed: true});
    firebase.database().ref("tasks/" + taskId).once("value", (snapshot) => {
        const taskData = snapshot.val();

        if (taskData) {
            firebase.database().ref("archived_tasks/" + taskId).set(taskData);
            firebase.database().ref("tasks/" + taskId).remove();
        }
    })
    
    triggerConffeti();

    //Refresh archived tasks list
    setTimeout(() => {
        displayArchivedTasks();
    }, 1500);
}

//Display completed tasks
const displayArchivedTasks = () => {
    firebase.database().ref("archived_tasks/").on("value", (snapshot) => {
        const archiveList = document.getElementById("archiveList");
        archiveList.innerHTML = "";

        snapshot.forEach((childSnapshot) => {
            const taskId = childSnapshot.key;
            const taskData = childSnapshot.val();           
            const taskItem = document.createElement("li");
            taskItem.textContent = taskData.task;
            taskItem.classList.add("list-group-item","text-muted");

            //Create unmark button
            const unmarkBtn = document.createElement("button");
            unmarkBtn.textContent = "Unmark";
            unmarkBtn.classList.add("btn", "btn-secondary", "ms-2");
            unmarkBtn.onclick = () => unmarkTask(taskId);

            taskItem.appendChild(unmarkBtn);
            archiveList.appendChild(taskItem);
        })
    })
}

//Umark task function
const unmarkTask = (taskId) => {
firebase.database().ref("archived_tasks/" + taskId).once("value", (snapshot) => {
    const taskData = snapshot.val();
    if (taskData) {
        //Move back to active tasks
        firebase.database().ref("tasks/" + taskId).set(taskData);
        //Remove from archived
        firebase.database().ref("archived_tasks/" + taskId).remove();
    }
})
setTimeout(() => {
    displayTasks();
    displayArchivedTasks();
}, 500);
}

const triggerConffeti = () => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: {y: 0.6},
    })
}

displayTasks();

// Load user tasks
const loadUserTasks = (userId) => {
    const userTaskRef = db.ref("tasks/" + userId); // User specific tasks
    userTaskRef.on("value", (snapshot) => {
        const tasks = snapshot.val();
        const taskList = document.getElementById("taskList");
        taskList.innerHTML = "";

        if (tasks) {
            Object.entries(tasks).forEach(([taskId, task]) => {
                // const task = tasks[taskId];
                const li = document.createElement("li");
                li.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");
                li.innerHTML = `
                ${task.text} 
                <div>
                    <button class="btn btn-success btn-sm" onclick="markComplete('${userId}', '${taskId})"> Save </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask('${userId}', '${taskId}')>Delete</button>
                </div>
                `;
                taskList.appendChild(li);
            });
        }
    });
}

// Google sign in
const googleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
    .then((result) => {
        console.log("User signed in:", result.user);
        document.getElementById("userInfo").innerHTML = `Welcome ${result.user.displayName}`;
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
        console.log("User signed out");
        document.getElementById("userInfo").innerHTML = "";
        document.getElementById("taskList").innerHTML = "";
    })
}
