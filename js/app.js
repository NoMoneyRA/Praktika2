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
                  <input type="checkbox" v-model="item.done" @change="toggleTaskItem(index)" :disabled="restrictFirstColumn || item.done"/>
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

};

const taskManager = new Vue({
    el: '#app',
    data() {
        return {
            newTask: {
                title: '',
                list: ['', '', ''],
                completedAt: null,
            },
            taskColumns: [
                { taskCards: JSON.parse(localStorage.getItem('column1')) || [] },
                { taskCards: JSON.parse(localStorage.getItem('column2')) || [] },
                { taskCards: JSON.parse(localStorage.getItem('column3')) || [] },
            ],
            restrictFirstColumn: false,
        };
    },
    methods: {
        modifyTask(index, column, data) {
            Object.assign(this.taskColumns[column - 1].taskCards[index], data);
            this.saveToStorage();
        }, // для сохранения изменений
        relocateTask(taskIndex, columnIndex) {
            if (taskIndex.column === 1 && this.restrictFirstColumn) return;
            const task = this.taskColumns[taskIndex.column - 1].taskCards.splice(taskIndex.index, 1)[0];
            this.taskColumns[columnIndex - 1].taskCards.push(task);
            this.saveToStorage();
            this.evaluateColumnRestrictions(); // ограничение на 1 колонку
        },
        evaluateColumnRestrictions() {
            const isSecondColumnFull = this.taskColumns[1].taskCards.length >= 5;
            const isFirstColumnBlocked = this.taskColumns[0].taskCards.some(task => {
                const completedItems = task.list.filter(item => item.done).length;
                return Math.floor((completedItems / task.list.length) * 100) > 50; // завершение
            });
            this.restrictFirstColumn = isSecondColumnFull && isFirstColumnBlocked;
        },
        saveToStorage() {
            localStorage.setItem('column1', JSON.stringify(this.taskColumns[0].taskCards));
            localStorage.setItem('column2', JSON.stringify(this.taskColumns[1].taskCards));
            localStorage.setItem('column3', JSON.stringify(this.taskColumns[2].taskCards));
        },
        addTask() {
            if (this.taskColumns[0].taskCards.length >= 3) {
                alert("Нельзя добавить больше 3 задач в первый столбец");
                return;
            }
            if (this.newTask.title.trim() && this.newTask.list.every(item => item.trim())) {
                this.taskColumns[0].taskCards.push({
                    title: this.newTask.title,
                    list: this.newTask.list.map(text => ({ text, done: false })),
                    completedAt: null
                });
                this.saveToStorage();
                this.newTask = { title: '', list: ['', '', ''], completedAt: null };
            }
        },
        addTaskItem() {
            if (this.newTask.list.length < 5) {
                this.newTask.list.push('');
            }
        },
        removeTaskItem(index) {
            if (this.newTask.list.length > 3) {
                this.newTask.list.splice(index, 1);
            }
        },
    },
    components: { TaskColumn },
    template: `
    <div id="app">
        <div class="task-manager">
            <h2>Создай новую заметку</h2>
            <form @submit.prevent="addTask">
                <label for="title">Название:</label>
                <input v-model="newTask.title" id="title" type="text" required />
                <label>Пункты (минимум 3, максимум 5):</label>
                <div v-for="(item, index) in newTask.list" :key="index" class="task-item">
                    <input v-model="newTask.list[index]" type="text" required />
                    <button type="button" @click="removeTaskItem(index)" v-if="newTask.list.length > 3">−</button>
                </div>
                <button type="button" @click="addTaskItem" :disabled="newTask.list.length >= 5">+</button>
                <button type="submit" :disabled="restrictFirstColumn">Создать</button>
            </form>
        </div>
        <div class="task-container">
            <TaskColumn v-for="(column, index) in taskColumns"
                        :key="index"
                        :columnID="index + 1"
                        :taskCards="column.taskCards"
                        :relocateTask="relocateTask"
                        :modifyTask="modifyTask"
                        :secondColumnTaskCount="taskColumns[1].taskCards.length" />
        </div>
    </div>
  `,
});
