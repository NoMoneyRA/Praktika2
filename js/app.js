const TaskCard = {
    props: {
        taskTitle: String,
        taskItems: Array,
        taskColumn: Number,
        taskIndex: Number,
        relocateTask: Function,
        completionTime: String,
        modifyTask: Function,
        secondColumnTaskCount: Number,
    },
    computed: {
        completionPercentage() {
            const finishedTasks = this.taskItems.filter(item => item.done).length;
            return Math.floor((finishedTasks / this.taskItems.length) * 100);
        },
        isRestricted() {
            return this.taskColumn === 1 && this.secondColumnTaskCount >= 5 && this.completionPercentage < 100;
        }
    },
    methods: {
        toggleTaskItem(index) {
            if (this.isRestricted || this.restrictFirstColumn) return;
            const finishedTasks = this.taskItems.filter(item => item.done).length;
            const completed = Math.floor((finishedTasks / this.taskItems.length) * 100);
            if (completed === 100 && !this.completionTime) {
                const finishTimestamp = new Date().toLocaleString();
                console.log('Task completed! Setting completion time:', finishTimestamp);
                this.modifyTask(this.taskIndex, this.taskColumn, { completedAt: finishTimestamp });
            }
            if (this.taskColumn === 1 && completed > 50) {
                this.relocateTask({ column: this.taskColumn, index: this.taskIndex }, 2);
            } else if (this.taskColumn === 2 && completed === 100) {
                this.relocateTask({ column: this.taskColumn, index: this.taskIndex }, 3);
            }
            this.$root.evaluateColumnRestrictions();
        },
    },
    template: `
        <div class="task-card">
            <h3>{{ taskTitle }}</h3>
            <ul>
                <li v-for="(item, index) in taskItems" :key="index">
                  <input type="checkbox" v-model="item.done" @change="toggleTaskItem(index)" :disabled="isRestricted || restrictFirstColumn || item.done"/>
                  {{ item.text }}
                </li>
            </ul>
            <p v-if="completionPercentage === 100">Completed at: {{ completionTime }}</p>
        </div>
    `,
};

const TaskColumn = {
    props: {
        columnID: Number,
        taskCards: Array,
        relocateTask: Function,
        modifyTask: Function,
        secondColumnTaskCount: Number,
        restrictFirstColumn: Boolean,
    },
    components: { TaskCard },
    template: `
        <div class="task-column">
            <h2>Столбец {{ columnID }}</h2>
            <div v-for="(card, index) in taskCards" :key="index">
                <TaskCard
                  :taskTitle="card.title"
                  :taskItems="card.list"
                  :taskColumn="columnID"
                  :taskIndex="index"
                  :completionTime="card.completedAt"
                  :relocateTask="relocateTask"
                  :modifyTask="modifyTask"
                  :secondColumnTaskCount="secondColumnTaskCount"
                  :restrictFirstColumn="restrictFirstColumn"
                />
            </div>
        </div>
    `,
};

const taskManager = new Vue({
    el: '#app',
    data() {
        return {
            taskColumns: [
                { taskCards: JSON.parse(localStorage.getItem('column1')) || [] },
                { taskCards: JSON.parse(localStorage.getItem('column2')) || [] },
                { taskCards: JSON.parse(localStorage.getItem('column3')) || [] },
            ],
            restrictFirstColumn: false,
            showModal: false,
            newTask: { title: '', list: ['', '', ''], completedAt: null },
            taskCount: 0,
            showSuccessModal: false,
        };
    },
    methods: {
        modifyTask(index, column, data) {
            Object.assign(this.taskColumns[column - 1].taskCards[index], data);
            this.saveToStorage();
        },
        relocateTask(taskIndex, columnIndex) {
            if (taskIndex.column === 1 && this.restrictFirstColumn) return;
            const task = this.taskColumns[taskIndex.column - 1].taskCards.splice(taskIndex.index, 1)[0];
            this.taskColumns[columnIndex - 1].taskCards.push(task);
            this.saveToStorage();
            this.evaluateColumnRestrictions();
        },
        evaluateColumnRestrictions() {
            this.restrictFirstColumn = this.taskColumns[1].taskCards.length >= 5;
        },
        saveToStorage() {
            localStorage.setItem('column1', JSON.stringify(this.taskColumns[0].taskCards));
            localStorage.setItem('column2', JSON.stringify(this.taskColumns[1].taskCards));
            localStorage.setItem('column3', JSON.stringify(this.taskColumns[2].taskCards));
        },
        openModal() {
            if (this.taskColumns[1].taskCards.length >= 5) {
                alert("Нельзя добавить новую задачу, пока во втором столбце 5 задач.");
                return;
            }
            if (this.taskColumns[0].taskCards.length >= 3) {
                alert("Нельзя добавить больше 3 задач в первый столбец");
                return;
            }
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
            this.newTask = { title: '', list: ['', '', ''], completedAt: null };
        },
        addTask() {
            if (!this.newTask.title.trim() || this.newTask.list.some(item => !item.trim())) {
                alert("Заполните все поля");
                return;
            }
            if (this.taskColumns[0].taskCards.length >= 3) {
                alert("Нельзя добавить больше 3 задач в первый столбец!");
                this.showModal = false;
                return;
            }
            this.taskColumns[0].taskCards.push({
                title: this.newTask.title,
                list: this.newTask.list.map(text => ({ text, done: false })),
                completedAt: null,
            });
            this.taskCount++;
            this.saveToStorage();
            this.showModal = false;
            this.showSuccessModal = true;
            this.newTask = { title: '', list: ['', '', ''], completedAt: null };
        },
        addAnotherTask() {
            this.showSuccessModal = false;
            this.showModal = true;
        },
        finishAddingTasks() {
            alert(`Вы добавили ${this.taskCount} карточек за сеанс`);
            this.showSuccessModal = false;
            this.taskCount = 0;
        },
        addListItem() {
            if (this.newTask.list.length < 5) {
                this.newTask.list.push('');
            }
        },
        removeListItem(index) {
            if (this.newTask.list.length > 3) {
                this.newTask.list.splice(index, 1);
            }
        }
    },
    components: { TaskColumn },
    template: `
    <div id="app">
        <button @click="openModal">Добавить карточку</button>
        <div v-if="showModal" class="modal">
            <h2>Создать карточку</h2>
            <input v-model="newTask.title" placeholder="Название" />
            <div v-for="(item, index) in newTask.list" :key="index">
                <input v-model="newTask.list[index]" placeholder="Описание" />
                <button @click="removeListItem(index)" v-if="newTask.list.length > 3">Удалить</button>
            </div>
            <button @click="addListItem" v-if="newTask.list.length < 5">Добавить пункт</button>
            <button @click="addTask">Создать</button>
            <button @click="closeModal">Отмена</button>
        </div>
        <div v-if="showSuccessModal" class="modal">
            <p>Карточка создана! Добавить еще?</p>
            <button @click="addAnotherTask">Да</button>
            <button @click="finishAddingTasks">Нет</button>
        </div>
        <div class="task-container">
            <TaskColumn v-for="(column, index) in taskColumns" :key="index" :columnID="index + 1" :taskCards="column.taskCards" :relocateTask="relocateTask" :modifyTask="modifyTask" :secondColumnTaskCount="taskColumns[1].taskCards.length" />
        </div>
    </div>
    `,
});
