import { Component, setIcon } from "obsidian";
import { t } from "@/translations/helper";
export class CalendarComponent extends Component {
    constructor(parentEl, config = {}) {
        super();
        this.parentEl = parentEl;
        this.config = config;
        // State
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.calendarDays = [];
        this.tasks = [];
        this.options = {
            showWeekends: true,
            firstDayOfWeek: 0,
            showTaskCounts: true,
        };
        this.displayedMonth = this.currentDate.getMonth();
        this.displayedYear = this.currentDate.getFullYear();
        this.options = Object.assign(Object.assign({}, this.options), this.config);
    }
    onload() {
        // Create calendar container
        this.containerEl = this.parentEl.createDiv({
            cls: "mini-calendar-container",
        });
        // Add hide-weekends class if weekend hiding is enabled
        if (!this.options.showWeekends) {
            this.containerEl.addClass("hide-weekends");
        }
        // Create header with navigation
        this.createCalendarHeader();
        // Create calendar grid
        this.calendarGridEl = this.containerEl.createDiv({
            cls: "calendar-grid",
        });
        // Generate initial calendar
        this.generateCalendar();
    }
    createCalendarHeader() {
        this.headerEl = this.containerEl.createDiv({
            cls: "calendar-header",
        });
        // Month and year display
        const titleEl = this.headerEl.createDiv({ cls: "calendar-title" });
        this.monthLabel = titleEl.createSpan({ cls: "calendar-month" });
        this.yearLabel = titleEl.createSpan({ cls: "calendar-year" });
        // Navigation buttons
        const navEl = this.headerEl.createDiv({ cls: "calendar-nav" });
        const prevBtn = navEl.createDiv({ cls: "calendar-nav-btn" });
        setIcon(prevBtn, "chevron-left");
        const nextBtn = navEl.createDiv({ cls: "calendar-nav-btn" });
        setIcon(nextBtn, "chevron-right");
        const todayBtn = navEl.createDiv({ cls: "calendar-today-btn" });
        todayBtn.setText(t("Today"));
        // Register event handlers
        this.registerDomEvent(prevBtn, "click", () => {
            this.navigateMonth(-1);
        });
        this.registerDomEvent(nextBtn, "click", () => {
            this.navigateMonth(1);
        });
        this.registerDomEvent(todayBtn, "click", () => {
            this.goToToday();
        });
    }
    generateCalendar() {
        // Clear existing calendar
        this.calendarGridEl.empty();
        this.calendarDays = [];
        // Update header
        const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        this.monthLabel.setText(monthNames[this.displayedMonth]);
        this.yearLabel.setText(this.displayedYear.toString());
        // Create day headers (Sun, Mon, etc.)
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const sortedDayNames = [...dayNames];
        // Adjust for first day of week setting
        if (this.options.firstDayOfWeek > 0) {
            for (let i = 0; i < this.options.firstDayOfWeek; i++) {
                sortedDayNames.push(sortedDayNames.shift());
            }
        }
        // Filter out weekend headers if showWeekends is false
        const filteredDayNames = this.options.showWeekends
            ? sortedDayNames
            : sortedDayNames.filter(day => day !== "Sat" && day !== "Sun");
        // Add day header cells
        filteredDayNames.forEach((day) => {
            const dayHeaderEl = this.calendarGridEl.createDiv({
                cls: "calendar-day-header",
                text: day,
            });
            // Highlight weekend headers (only if they're shown)
            if ((day === "Sat" || day === "Sun") &&
                !this.options.showWeekends) {
                dayHeaderEl.addClass("calendar-weekend");
            }
        });
        // Calculate first day to display
        const firstDayOfMonth = new Date(this.displayedYear, this.displayedMonth, 1);
        let startDay = firstDayOfMonth.getDay() - this.options.firstDayOfWeek;
        if (startDay < 0)
            startDay += 7;
        // Calculate number of days in month
        const daysInMonth = new Date(this.displayedYear, this.displayedMonth + 1, 0).getDate();
        // Calculate days from previous month to display
        const prevMonthDays = startDay;
        const prevMonth = this.displayedMonth === 0 ? 11 : this.displayedMonth - 1;
        const prevMonthYear = this.displayedMonth === 0
            ? this.displayedYear - 1
            : this.displayedYear;
        const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
        // Current date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDay = this.selectedDate.getDate();
        const selectedMonth = this.selectedDate.getMonth();
        const selectedYear = this.selectedDate.getFullYear();
        // Generate days for previous month
        for (let i = 0; i < prevMonthDays; i++) {
            const dayNum = daysInPrevMonth - prevMonthDays + i + 1;
            const date = new Date(prevMonthYear, prevMonth, dayNum);
            const isSelected = dayNum === selectedDay &&
                prevMonth === selectedMonth &&
                prevMonthYear === selectedYear;
            this.addCalendarDay(date, false, isSelected, false, false);
        }
        // Generate days for current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(this.displayedYear, this.displayedMonth, i);
            const isToday = date.getTime() === today.getTime();
            const isSelected = i === selectedDay &&
                this.displayedMonth === selectedMonth &&
                this.displayedYear === selectedYear;
            const isPastDue = date < today;
            const isFuture = date > today;
            this.addCalendarDay(date, isToday, isSelected, isPastDue, isFuture, true);
        }
        // Calculate days from next month to display (to fill grid)
        const totalDaysDisplayed = prevMonthDays + daysInMonth;
        const nextMonthDays = 42 - totalDaysDisplayed; // 6 rows of 7 days = 42
        // Generate days for next month
        const nextMonth = this.displayedMonth === 11 ? 0 : this.displayedMonth + 1;
        const nextMonthYear = this.displayedMonth === 11
            ? this.displayedYear + 1
            : this.displayedYear;
        for (let i = 1; i <= nextMonthDays; i++) {
            const date = new Date(nextMonthYear, nextMonth, i);
            const isSelected = i === selectedDay &&
                nextMonth === selectedMonth &&
                nextMonthYear === selectedYear;
            this.addCalendarDay(date, false, isSelected, false, true);
        }
    }
    addCalendarDay(date, isToday, isSelected, isPastDue, isFuture, isThisMonth = false) {
        // Skip weekend days if showWeekends is false
        const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
        if (!this.options.showWeekends && isWeekend) {
            return; // Skip creating this day
        }
        // Filter tasks for this day
        const dayTasks = this.getTasksForDate(date);
        // Create calendar day object
        const calendarDay = {
            date,
            tasks: dayTasks,
            isToday,
            isSelected,
            isPastDue,
            isFuture,
            isThisMonth,
        };
        this.calendarDays.push(calendarDay);
        // Create the UI element
        const dayEl = this.calendarGridEl.createDiv({ cls: "calendar-day" });
        if (!isThisMonth)
            dayEl.addClass("other-month");
        if (isToday)
            dayEl.addClass("today");
        if (isSelected)
            dayEl.addClass("selected");
        if (isPastDue)
            dayEl.addClass("past-due");
        // Day number
        const dayNumEl = dayEl.createDiv({
            cls: "calendar-day-number",
            text: date.getDate().toString(),
        });
        // Task count badge (if there are tasks)
        if (this.options.showTaskCounts && dayTasks.length > 0) {
            const countEl = dayEl.createDiv({
                cls: "calendar-day-count",
                text: dayTasks.length.toString(),
            });
            // Add class based on task priority
            const hasPriorityTasks = dayTasks.some((task) => task.metadata.priority && task.metadata.priority >= 2);
            if (hasPriorityTasks) {
                countEl.addClass("has-priority");
            }
        }
        // Register click event
        this.registerDomEvent(dayEl, "click", () => {
            this.selectDate(date);
        });
    }
    selectDate(date) {
        this.selectedDate = date;
        // If the selected date is in a different month, navigate to that month
        if (date.getMonth() !== this.displayedMonth ||
            date.getFullYear() !== this.displayedYear) {
            this.displayedMonth = date.getMonth();
            this.displayedYear = date.getFullYear();
            this.generateCalendar();
        }
        else {
            // Just update selected state
            const allDayEls = this.calendarGridEl.querySelectorAll(".calendar-day");
            allDayEls.forEach((el, index) => {
                if (index < this.calendarDays.length) {
                    const day = this.calendarDays[index];
                    if (day.date.getDate() === date.getDate() &&
                        day.date.getMonth() === date.getMonth() &&
                        day.date.getFullYear() === date.getFullYear()) {
                        el.addClass("selected");
                        day.isSelected = true;
                    }
                    else {
                        el.removeClass("selected");
                        day.isSelected = false;
                    }
                }
            });
        }
        // Trigger callback
        if (this.onDateSelected) {
            const selectedDayTasks = this.getTasksForDate(date);
            this.onDateSelected(date, selectedDayTasks);
        }
    }
    navigateMonth(delta) {
        this.displayedMonth += delta;
        // Handle year change
        if (this.displayedMonth > 11) {
            this.displayedMonth = 0;
            this.displayedYear++;
        }
        else if (this.displayedMonth < 0) {
            this.displayedMonth = 11;
            this.displayedYear--;
        }
        this.generateCalendar();
        if (this.onMonthChanged) {
            this.onMonthChanged(this.displayedMonth, this.displayedYear);
        }
    }
    goToToday() {
        const today = new Date();
        this.displayedMonth = today.getMonth();
        this.displayedYear = today.getFullYear();
        this.selectDate(today);
    }
    getTasksForDate(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const startTimestamp = startOfDay.getTime();
        const endTimestamp = endOfDay.getTime();
        return this.tasks.filter((task) => {
            if (task.metadata.dueDate) {
                const dueDate = new Date(task.metadata.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() === startTimestamp;
            }
            return false;
        });
    }
    setTasks(tasks) {
        this.tasks = tasks;
        this.generateCalendar();
    }
    setOptions(options) {
        this.options = Object.assign(Object.assign({}, this.options), options);
        this.generateCalendar();
    }
    setCurrentDate(date) {
        // Update the current date
        this.currentDate = new Date(date);
        this.currentDate.setHours(0, 0, 0, 0);
        // Regenerate the calendar to update "today" highlighting
        this.generateCalendar();
    }
    onunload() {
        this.containerEl.empty();
        this.containerEl.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYWxlbmRhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUU5QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFrQjFDLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxTQUFTO0lBMEIvQyxZQUNTLFFBQXFCLEVBQ3JCLFNBQW1DLEVBQUU7UUFFN0MsS0FBSyxFQUFFLENBQUM7UUFIQSxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFdBQU0sR0FBTixNQUFNLENBQStCO1FBcEI5QyxRQUFRO1FBQ0EsZ0JBQVcsR0FBUyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQy9CLGlCQUFZLEdBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUdoQyxpQkFBWSxHQUFrQixFQUFFLENBQUM7UUFDakMsVUFBSyxHQUFXLEVBQUUsQ0FBQztRQUVuQixZQUFPLEdBQW9CO1lBQ2xDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLGNBQWMsRUFBRSxDQUFDO1lBQ2pCLGNBQWMsRUFBRSxJQUFJO1NBQ3BCLENBQUM7UUFXRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3BELElBQUksQ0FBQyxPQUFPLG1DQUFRLElBQUksQ0FBQyxPQUFPLEdBQUssSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFDO0lBQ3BELENBQUM7SUFFRCxNQUFNO1FBQ0wsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDMUMsR0FBRyxFQUFFLHlCQUF5QjtTQUM5QixDQUFDLENBQUM7UUFFSCx1REFBdUQ7UUFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO1lBQy9CLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1NBQzNDO1FBRUQsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTVCLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQ2hELEdBQUcsRUFBRSxlQUFlO1NBQ3BCLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDMUMsR0FBRyxFQUFFLGlCQUFpQjtTQUN0QixDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFOUQscUJBQXFCO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVqQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRWxDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFN0IsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM3QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBRXZCLGdCQUFnQjtRQUNoQixNQUFNLFVBQVUsR0FBRztZQUNsQixTQUFTO1lBQ1QsVUFBVTtZQUNWLE9BQU87WUFDUCxPQUFPO1lBQ1AsS0FBSztZQUNMLE1BQU07WUFDTixNQUFNO1lBQ04sUUFBUTtZQUNSLFdBQVc7WUFDWCxTQUFTO1lBQ1QsVUFBVTtZQUNWLFVBQVU7U0FDVixDQUFDO1FBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUV0RCxzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRSxNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFFckMsdUNBQXVDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxFQUFFO1lBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDckQsY0FBYyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFHLENBQUMsQ0FBQzthQUM3QztTQUNEO1FBRUQsc0RBQXNEO1FBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZO1lBQ2pELENBQUMsQ0FBQyxjQUFjO1lBQ2hCLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEtBQUssSUFBSSxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7UUFFaEUsdUJBQXVCO1FBQ3ZCLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUNqRCxHQUFHLEVBQUUscUJBQXFCO2dCQUMxQixJQUFJLEVBQUUsR0FBRzthQUNULENBQUMsQ0FBQztZQUVILG9EQUFvRDtZQUNwRCxJQUNDLENBQUMsR0FBRyxLQUFLLEtBQUssSUFBSSxHQUFHLEtBQUssS0FBSyxDQUFDO2dCQUNoQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUN6QjtnQkFDRCxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDekM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLElBQUksQ0FDL0IsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsQ0FBQyxDQUNELENBQUM7UUFDRixJQUFJLFFBQVEsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDdEUsSUFBSSxRQUFRLEdBQUcsQ0FBQztZQUFFLFFBQVEsSUFBSSxDQUFDLENBQUM7UUFFaEMsb0NBQW9DO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxDQUMzQixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsRUFDdkIsQ0FBQyxDQUNELENBQUMsT0FBTyxFQUFFLENBQUM7UUFFWixnREFBZ0Q7UUFDaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDO1FBQy9CLE1BQU0sU0FBUyxHQUNkLElBQUksQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQzFELE1BQU0sYUFBYSxHQUNsQixJQUFJLENBQUMsY0FBYyxLQUFLLENBQUM7WUFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQztZQUN4QixDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUN2QixNQUFNLGVBQWUsR0FBRyxJQUFJLElBQUksQ0FDL0IsYUFBYSxFQUNiLFNBQVMsR0FBRyxDQUFDLEVBQ2IsQ0FBQyxDQUNELENBQUMsT0FBTyxFQUFFLENBQUM7UUFFWiw4QkFBOEI7UUFDOUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXJELG1DQUFtQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLGVBQWUsR0FBRyxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXhELE1BQU0sVUFBVSxHQUNmLE1BQU0sS0FBSyxXQUFXO2dCQUN0QixTQUFTLEtBQUssYUFBYTtnQkFDM0IsYUFBYSxLQUFLLFlBQVksQ0FBQztZQUVoQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztTQUMzRDtRQUVELGtDQUFrQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25ELE1BQU0sVUFBVSxHQUNmLENBQUMsS0FBSyxXQUFXO2dCQUNqQixJQUFJLENBQUMsY0FBYyxLQUFLLGFBQWE7Z0JBQ3JDLElBQUksQ0FBQyxhQUFhLEtBQUssWUFBWSxDQUFDO1lBQ3JDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7WUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUU5QixJQUFJLENBQUMsY0FBYyxDQUNsQixJQUFJLEVBQ0osT0FBTyxFQUNQLFVBQVUsRUFDVixTQUFTLEVBQ1QsUUFBUSxFQUNSLElBQUksQ0FDSixDQUFDO1NBQ0Y7UUFFRCwyREFBMkQ7UUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLEdBQUcsV0FBVyxDQUFDO1FBQ3ZELE1BQU0sYUFBYSxHQUFHLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLHdCQUF3QjtRQUV2RSwrQkFBK0I7UUFDL0IsTUFBTSxTQUFTLEdBQ2QsSUFBSSxDQUFDLGNBQWMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDMUQsTUFBTSxhQUFhLEdBQ2xCLElBQUksQ0FBQyxjQUFjLEtBQUssRUFBRTtZQUN6QixDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBRXZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVuRCxNQUFNLFVBQVUsR0FDZixDQUFDLEtBQUssV0FBVztnQkFDakIsU0FBUyxLQUFLLGFBQWE7Z0JBQzNCLGFBQWEsS0FBSyxZQUFZLENBQUM7WUFFaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDMUQ7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUNyQixJQUFVLEVBQ1YsT0FBZ0IsRUFDaEIsVUFBbUIsRUFDbkIsU0FBa0IsRUFDbEIsUUFBaUIsRUFDakIsY0FBdUIsS0FBSztRQUU1Qiw2Q0FBNkM7UUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMscUJBQXFCO1FBQ25GLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxTQUFTLEVBQUU7WUFDNUMsT0FBTyxDQUFDLHlCQUF5QjtTQUNqQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTVDLDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FBZ0I7WUFDaEMsSUFBSTtZQUNKLEtBQUssRUFBRSxRQUFRO1lBQ2YsT0FBTztZQUNQLFVBQVU7WUFDVixTQUFTO1lBQ1QsUUFBUTtZQUNSLFdBQVc7U0FDWCxDQUFDO1FBRUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFcEMsd0JBQXdCO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFckUsSUFBSSxDQUFDLFdBQVc7WUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2hELElBQUksT0FBTztZQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsSUFBSSxVQUFVO1lBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzQyxJQUFJLFNBQVM7WUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTFDLGFBQWE7UUFDYixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQ2hDLEdBQUcsRUFBRSxxQkFBcUI7WUFDMUIsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUU7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsd0NBQXdDO1FBQ3hDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztnQkFDL0IsR0FBRyxFQUFFLG9CQUFvQjtnQkFDekIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO2FBQ2hDLENBQUMsQ0FBQztZQUVILG1DQUFtQztZQUNuQyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQ3JDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQy9ELENBQUM7WUFDRixJQUFJLGdCQUFnQixFQUFFO2dCQUNyQixPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQ2pDO1NBQ0Q7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sVUFBVSxDQUFDLElBQVU7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFFekIsdUVBQXVFO1FBQ3ZFLElBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxjQUFjO1lBQ3ZDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLENBQUMsYUFBYSxFQUN4QztZQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1NBQ3hCO2FBQU07WUFDTiw2QkFBNkI7WUFDN0IsTUFBTSxTQUFTLEdBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2RCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUMvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtvQkFDckMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDckMsSUFDQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ3JDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTt3QkFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQzVDO3dCQUNELEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQ3hCLEdBQUcsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO3FCQUN0Qjt5QkFBTTt3QkFDTixFQUFFLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUMzQixHQUFHLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztxQkFDdkI7aUJBQ0Q7WUFDRixDQUFDLENBQUMsQ0FBQztTQUNIO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN4QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztTQUM1QztJQUNGLENBQUM7SUFFTyxhQUFhLENBQUMsS0FBYTtRQUNsQyxJQUFJLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQztRQUU3QixxQkFBcUI7UUFDckIsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsRUFBRTtZQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7U0FDckI7YUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUNyQjtRQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRXhCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzdEO0lBQ0YsQ0FBQztJQUVPLFNBQVM7UUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFTyxlQUFlLENBQUMsSUFBVTtRQUNqQyxNQUFNLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhDLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFbkMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV4QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDakMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0IsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssY0FBYyxDQUFDO2FBQzVDO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxRQUFRLENBQUMsS0FBYTtRQUM1QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU0sVUFBVSxDQUFDLE9BQWlDO1FBQ2xELElBQUksQ0FBQyxPQUFPLG1DQUFRLElBQUksQ0FBQyxPQUFPLEdBQUssT0FBTyxDQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVNLGNBQWMsQ0FBQyxJQUFVO1FBQy9CLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRDLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUMzQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2FsZW5kYXJEYXkge1xyXG5cdGRhdGU6IERhdGU7XHJcblx0dGFza3M6IFRhc2tbXTtcclxuXHRpc1RvZGF5OiBib29sZWFuO1xyXG5cdGlzU2VsZWN0ZWQ6IGJvb2xlYW47XHJcblx0aXNQYXN0RHVlOiBib29sZWFuO1xyXG5cdGlzRnV0dXJlOiBib29sZWFuO1xyXG5cdGlzVGhpc01vbnRoOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENhbGVuZGFyT3B0aW9ucyB7XHJcblx0c2hvd1dlZWtlbmRzOiBib29sZWFuO1xyXG5cdGZpcnN0RGF5T2ZXZWVrOiBudW1iZXI7IC8vIDAgPSBTdW5kYXksIDEgPSBNb25kYXksIGV0Yy5cclxuXHRzaG93VGFza0NvdW50czogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENhbGVuZGFyQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHQvLyBVSSBFbGVtZW50c1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBoZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjYWxlbmRhckdyaWRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBtb250aExhYmVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHllYXJMYWJlbDogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdC8vIFN0YXRlXHJcblx0cHJpdmF0ZSBjdXJyZW50RGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0cHJpdmF0ZSBzZWxlY3RlZERhdGU6IERhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdHByaXZhdGUgZGlzcGxheWVkTW9udGg6IG51bWJlcjtcclxuXHRwcml2YXRlIGRpc3BsYXllZFllYXI6IG51bWJlcjtcclxuXHRwcml2YXRlIGNhbGVuZGFyRGF5czogQ2FsZW5kYXJEYXlbXSA9IFtdO1xyXG5cdHByaXZhdGUgdGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cclxuXHRwcml2YXRlIG9wdGlvbnM6IENhbGVuZGFyT3B0aW9ucyA9IHtcclxuXHRcdHNob3dXZWVrZW5kczogdHJ1ZSxcclxuXHRcdGZpcnN0RGF5T2ZXZWVrOiAwLFxyXG5cdFx0c2hvd1Rhc2tDb3VudHM6IHRydWUsXHJcblx0fTtcclxuXHJcblx0Ly8gRXZlbnRzXHJcblx0cHVibGljIG9uRGF0ZVNlbGVjdGVkOiAoZGF0ZTogRGF0ZSwgdGFza3M6IFRhc2tbXSkgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25Nb250aENoYW5nZWQ6IChtb250aDogbnVtYmVyLCB5ZWFyOiBudW1iZXIpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGNvbmZpZzogUGFydGlhbDxDYWxlbmRhck9wdGlvbnM+ID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRNb250aCgpO1xyXG5cdFx0dGhpcy5kaXNwbGF5ZWRZZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG5cdFx0dGhpcy5vcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLnRoaXMuY29uZmlnIH07XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHQvLyBDcmVhdGUgY2FsZW5kYXIgY29udGFpbmVyXHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwibWluaS1jYWxlbmRhci1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFkZCBoaWRlLXdlZWtlbmRzIGNsYXNzIGlmIHdlZWtlbmQgaGlkaW5nIGlzIGVuYWJsZWRcclxuXHRcdGlmICghdGhpcy5vcHRpb25zLnNob3dXZWVrZW5kcykge1xyXG5cdFx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwiaGlkZS13ZWVrZW5kc1wiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgaGVhZGVyIHdpdGggbmF2aWdhdGlvblxyXG5cdFx0dGhpcy5jcmVhdGVDYWxlbmRhckhlYWRlcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjYWxlbmRhciBncmlkXHJcblx0XHR0aGlzLmNhbGVuZGFyR3JpZEVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY2FsZW5kYXItZ3JpZFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgaW5pdGlhbCBjYWxlbmRhclxyXG5cdFx0dGhpcy5nZW5lcmF0ZUNhbGVuZGFyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZUNhbGVuZGFySGVhZGVyKCkge1xyXG5cdFx0dGhpcy5oZWFkZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImNhbGVuZGFyLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTW9udGggYW5kIHllYXIgZGlzcGxheVxyXG5cdFx0Y29uc3QgdGl0bGVFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcImNhbGVuZGFyLXRpdGxlXCIgfSk7XHJcblx0XHR0aGlzLm1vbnRoTGFiZWwgPSB0aXRsZUVsLmNyZWF0ZVNwYW4oeyBjbHM6IFwiY2FsZW5kYXItbW9udGhcIiB9KTtcclxuXHRcdHRoaXMueWVhckxhYmVsID0gdGl0bGVFbC5jcmVhdGVTcGFuKHsgY2xzOiBcImNhbGVuZGFyLXllYXJcIiB9KTtcclxuXHJcblx0XHQvLyBOYXZpZ2F0aW9uIGJ1dHRvbnNcclxuXHRcdGNvbnN0IG5hdkVsID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY2FsZW5kYXItbmF2XCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgcHJldkJ0biA9IG5hdkVsLmNyZWF0ZURpdih7IGNsczogXCJjYWxlbmRhci1uYXYtYnRuXCIgfSk7XHJcblx0XHRzZXRJY29uKHByZXZCdG4sIFwiY2hldnJvbi1sZWZ0XCIpO1xyXG5cclxuXHRcdGNvbnN0IG5leHRCdG4gPSBuYXZFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY2FsZW5kYXItbmF2LWJ0blwiIH0pO1xyXG5cdFx0c2V0SWNvbihuZXh0QnRuLCBcImNoZXZyb24tcmlnaHRcIik7XHJcblxyXG5cdFx0Y29uc3QgdG9kYXlCdG4gPSBuYXZFbC5jcmVhdGVEaXYoeyBjbHM6IFwiY2FsZW5kYXItdG9kYXktYnRuXCIgfSk7XHJcblx0XHR0b2RheUJ0bi5zZXRUZXh0KHQoXCJUb2RheVwiKSk7XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgZXZlbnQgaGFuZGxlcnNcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChwcmV2QnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5uYXZpZ2F0ZU1vbnRoKC0xKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChuZXh0QnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5uYXZpZ2F0ZU1vbnRoKDEpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRvZGF5QnRuLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0dGhpcy5nb1RvVG9kYXkoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUNhbGVuZGFyKCkge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgY2FsZW5kYXJcclxuXHRcdHRoaXMuY2FsZW5kYXJHcmlkRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY2FsZW5kYXJEYXlzID0gW107XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGhlYWRlclxyXG5cdFx0Y29uc3QgbW9udGhOYW1lcyA9IFtcclxuXHRcdFx0XCJKYW51YXJ5XCIsXHJcblx0XHRcdFwiRmVicnVhcnlcIixcclxuXHRcdFx0XCJNYXJjaFwiLFxyXG5cdFx0XHRcIkFwcmlsXCIsXHJcblx0XHRcdFwiTWF5XCIsXHJcblx0XHRcdFwiSnVuZVwiLFxyXG5cdFx0XHRcIkp1bHlcIixcclxuXHRcdFx0XCJBdWd1c3RcIixcclxuXHRcdFx0XCJTZXB0ZW1iZXJcIixcclxuXHRcdFx0XCJPY3RvYmVyXCIsXHJcblx0XHRcdFwiTm92ZW1iZXJcIixcclxuXHRcdFx0XCJEZWNlbWJlclwiLFxyXG5cdFx0XTtcclxuXHRcdHRoaXMubW9udGhMYWJlbC5zZXRUZXh0KG1vbnRoTmFtZXNbdGhpcy5kaXNwbGF5ZWRNb250aF0pO1xyXG5cdFx0dGhpcy55ZWFyTGFiZWwuc2V0VGV4dCh0aGlzLmRpc3BsYXllZFllYXIudG9TdHJpbmcoKSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGRheSBoZWFkZXJzIChTdW4sIE1vbiwgZXRjLilcclxuXHRcdGNvbnN0IGRheU5hbWVzID0gW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdO1xyXG5cdFx0Y29uc3Qgc29ydGVkRGF5TmFtZXMgPSBbLi4uZGF5TmFtZXNdO1xyXG5cclxuXHRcdC8vIEFkanVzdCBmb3IgZmlyc3QgZGF5IG9mIHdlZWsgc2V0dGluZ1xyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5maXJzdERheU9mV2VlayA+IDApIHtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wdGlvbnMuZmlyc3REYXlPZldlZWs7IGkrKykge1xyXG5cdFx0XHRcdHNvcnRlZERheU5hbWVzLnB1c2goc29ydGVkRGF5TmFtZXMuc2hpZnQoKSEpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmlsdGVyIG91dCB3ZWVrZW5kIGhlYWRlcnMgaWYgc2hvd1dlZWtlbmRzIGlzIGZhbHNlXHJcblx0XHRjb25zdCBmaWx0ZXJlZERheU5hbWVzID0gdGhpcy5vcHRpb25zLnNob3dXZWVrZW5kc1xyXG5cdFx0XHQ/IHNvcnRlZERheU5hbWVzXHJcblx0XHRcdDogc29ydGVkRGF5TmFtZXMuZmlsdGVyKGRheSA9PiBkYXkgIT09IFwiU2F0XCIgJiYgZGF5ICE9PSBcIlN1blwiKTtcclxuXHJcblx0XHQvLyBBZGQgZGF5IGhlYWRlciBjZWxsc1xyXG5cdFx0ZmlsdGVyZWREYXlOYW1lcy5mb3JFYWNoKChkYXkpID0+IHtcclxuXHRcdFx0Y29uc3QgZGF5SGVhZGVyRWwgPSB0aGlzLmNhbGVuZGFyR3JpZEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcImNhbGVuZGFyLWRheS1oZWFkZXJcIixcclxuXHRcdFx0XHR0ZXh0OiBkYXksXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gSGlnaGxpZ2h0IHdlZWtlbmQgaGVhZGVycyAob25seSBpZiB0aGV5J3JlIHNob3duKVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0KGRheSA9PT0gXCJTYXRcIiB8fCBkYXkgPT09IFwiU3VuXCIpICYmXHJcblx0XHRcdFx0IXRoaXMub3B0aW9ucy5zaG93V2Vla2VuZHNcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0ZGF5SGVhZGVyRWwuYWRkQ2xhc3MoXCJjYWxlbmRhci13ZWVrZW5kXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgZmlyc3QgZGF5IHRvIGRpc3BsYXlcclxuXHRcdGNvbnN0IGZpcnN0RGF5T2ZNb250aCA9IG5ldyBEYXRlKFxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZFllYXIsXHJcblx0XHRcdHRoaXMuZGlzcGxheWVkTW9udGgsXHJcblx0XHRcdDFcclxuXHRcdCk7XHJcblx0XHRsZXQgc3RhcnREYXkgPSBmaXJzdERheU9mTW9udGguZ2V0RGF5KCkgLSB0aGlzLm9wdGlvbnMuZmlyc3REYXlPZldlZWs7XHJcblx0XHRpZiAoc3RhcnREYXkgPCAwKSBzdGFydERheSArPSA3O1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSBudW1iZXIgb2YgZGF5cyBpbiBtb250aFxyXG5cdFx0Y29uc3QgZGF5c0luTW9udGggPSBuZXcgRGF0ZShcclxuXHRcdFx0dGhpcy5kaXNwbGF5ZWRZZWFyLFxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoICsgMSxcclxuXHRcdFx0MFxyXG5cdFx0KS5nZXREYXRlKCk7XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIGRheXMgZnJvbSBwcmV2aW91cyBtb250aCB0byBkaXNwbGF5XHJcblx0XHRjb25zdCBwcmV2TW9udGhEYXlzID0gc3RhcnREYXk7XHJcblx0XHRjb25zdCBwcmV2TW9udGggPVxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID09PSAwID8gMTEgOiB0aGlzLmRpc3BsYXllZE1vbnRoIC0gMTtcclxuXHRcdGNvbnN0IHByZXZNb250aFllYXIgPVxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID09PSAwXHJcblx0XHRcdFx0PyB0aGlzLmRpc3BsYXllZFllYXIgLSAxXHJcblx0XHRcdFx0OiB0aGlzLmRpc3BsYXllZFllYXI7XHJcblx0XHRjb25zdCBkYXlzSW5QcmV2TW9udGggPSBuZXcgRGF0ZShcclxuXHRcdFx0cHJldk1vbnRoWWVhcixcclxuXHRcdFx0cHJldk1vbnRoICsgMSxcclxuXHRcdFx0MFxyXG5cdFx0KS5nZXREYXRlKCk7XHJcblxyXG5cdFx0Ly8gQ3VycmVudCBkYXRlIGZvciBjb21wYXJpc29uXHJcblx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHRjb25zdCBzZWxlY3RlZERheSA9IHRoaXMuc2VsZWN0ZWREYXRlLmdldERhdGUoKTtcclxuXHRcdGNvbnN0IHNlbGVjdGVkTW9udGggPSB0aGlzLnNlbGVjdGVkRGF0ZS5nZXRNb250aCgpO1xyXG5cdFx0Y29uc3Qgc2VsZWN0ZWRZZWFyID0gdGhpcy5zZWxlY3RlZERhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHJcblx0XHQvLyBHZW5lcmF0ZSBkYXlzIGZvciBwcmV2aW91cyBtb250aFxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBwcmV2TW9udGhEYXlzOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgZGF5TnVtID0gZGF5c0luUHJldk1vbnRoIC0gcHJldk1vbnRoRGF5cyArIGkgKyAxO1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUocHJldk1vbnRoWWVhciwgcHJldk1vbnRoLCBkYXlOdW0pO1xyXG5cclxuXHRcdFx0Y29uc3QgaXNTZWxlY3RlZCA9XHJcblx0XHRcdFx0ZGF5TnVtID09PSBzZWxlY3RlZERheSAmJlxyXG5cdFx0XHRcdHByZXZNb250aCA9PT0gc2VsZWN0ZWRNb250aCAmJlxyXG5cdFx0XHRcdHByZXZNb250aFllYXIgPT09IHNlbGVjdGVkWWVhcjtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ2FsZW5kYXJEYXkoZGF0ZSwgZmFsc2UsIGlzU2VsZWN0ZWQsIGZhbHNlLCBmYWxzZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgZGF5cyBmb3IgY3VycmVudCBtb250aFxyXG5cdFx0Zm9yIChsZXQgaSA9IDE7IGkgPD0gZGF5c0luTW9udGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUodGhpcy5kaXNwbGF5ZWRZZWFyLCB0aGlzLmRpc3BsYXllZE1vbnRoLCBpKTtcclxuXHJcblx0XHRcdGNvbnN0IGlzVG9kYXkgPSBkYXRlLmdldFRpbWUoKSA9PT0gdG9kYXkuZ2V0VGltZSgpO1xyXG5cdFx0XHRjb25zdCBpc1NlbGVjdGVkID1cclxuXHRcdFx0XHRpID09PSBzZWxlY3RlZERheSAmJlxyXG5cdFx0XHRcdHRoaXMuZGlzcGxheWVkTW9udGggPT09IHNlbGVjdGVkTW9udGggJiZcclxuXHRcdFx0XHR0aGlzLmRpc3BsYXllZFllYXIgPT09IHNlbGVjdGVkWWVhcjtcclxuXHRcdFx0Y29uc3QgaXNQYXN0RHVlID0gZGF0ZSA8IHRvZGF5O1xyXG5cdFx0XHRjb25zdCBpc0Z1dHVyZSA9IGRhdGUgPiB0b2RheTtcclxuXHJcblx0XHRcdHRoaXMuYWRkQ2FsZW5kYXJEYXkoXHJcblx0XHRcdFx0ZGF0ZSxcclxuXHRcdFx0XHRpc1RvZGF5LFxyXG5cdFx0XHRcdGlzU2VsZWN0ZWQsXHJcblx0XHRcdFx0aXNQYXN0RHVlLFxyXG5cdFx0XHRcdGlzRnV0dXJlLFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgZGF5cyBmcm9tIG5leHQgbW9udGggdG8gZGlzcGxheSAodG8gZmlsbCBncmlkKVxyXG5cdFx0Y29uc3QgdG90YWxEYXlzRGlzcGxheWVkID0gcHJldk1vbnRoRGF5cyArIGRheXNJbk1vbnRoO1xyXG5cdFx0Y29uc3QgbmV4dE1vbnRoRGF5cyA9IDQyIC0gdG90YWxEYXlzRGlzcGxheWVkOyAvLyA2IHJvd3Mgb2YgNyBkYXlzID0gNDJcclxuXHJcblx0XHQvLyBHZW5lcmF0ZSBkYXlzIGZvciBuZXh0IG1vbnRoXHJcblx0XHRjb25zdCBuZXh0TW9udGggPVxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID09PSAxMSA/IDAgOiB0aGlzLmRpc3BsYXllZE1vbnRoICsgMTtcclxuXHRcdGNvbnN0IG5leHRNb250aFllYXIgPVxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID09PSAxMVxyXG5cdFx0XHRcdD8gdGhpcy5kaXNwbGF5ZWRZZWFyICsgMVxyXG5cdFx0XHRcdDogdGhpcy5kaXNwbGF5ZWRZZWFyO1xyXG5cclxuXHRcdGZvciAobGV0IGkgPSAxOyBpIDw9IG5leHRNb250aERheXM7IGkrKykge1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUobmV4dE1vbnRoWWVhciwgbmV4dE1vbnRoLCBpKTtcclxuXHJcblx0XHRcdGNvbnN0IGlzU2VsZWN0ZWQgPVxyXG5cdFx0XHRcdGkgPT09IHNlbGVjdGVkRGF5ICYmXHJcblx0XHRcdFx0bmV4dE1vbnRoID09PSBzZWxlY3RlZE1vbnRoICYmXHJcblx0XHRcdFx0bmV4dE1vbnRoWWVhciA9PT0gc2VsZWN0ZWRZZWFyO1xyXG5cclxuXHRcdFx0dGhpcy5hZGRDYWxlbmRhckRheShkYXRlLCBmYWxzZSwgaXNTZWxlY3RlZCwgZmFsc2UsIHRydWUpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhZGRDYWxlbmRhckRheShcclxuXHRcdGRhdGU6IERhdGUsXHJcblx0XHRpc1RvZGF5OiBib29sZWFuLFxyXG5cdFx0aXNTZWxlY3RlZDogYm9vbGVhbixcclxuXHRcdGlzUGFzdER1ZTogYm9vbGVhbixcclxuXHRcdGlzRnV0dXJlOiBib29sZWFuLFxyXG5cdFx0aXNUaGlzTW9udGg6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCkge1xyXG5cdFx0Ly8gU2tpcCB3ZWVrZW5kIGRheXMgaWYgc2hvd1dlZWtlbmRzIGlzIGZhbHNlXHJcblx0XHRjb25zdCBpc1dlZWtlbmQgPSBkYXRlLmdldERheSgpID09PSAwIHx8IGRhdGUuZ2V0RGF5KCkgPT09IDY7IC8vIFN1bmRheSBvciBTYXR1cmRheVxyXG5cdFx0aWYgKCF0aGlzLm9wdGlvbnMuc2hvd1dlZWtlbmRzICYmIGlzV2Vla2VuZCkge1xyXG5cdFx0XHRyZXR1cm47IC8vIFNraXAgY3JlYXRpbmcgdGhpcyBkYXlcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXIgdGFza3MgZm9yIHRoaXMgZGF5XHJcblx0XHRjb25zdCBkYXlUYXNrcyA9IHRoaXMuZ2V0VGFza3NGb3JEYXRlKGRhdGUpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjYWxlbmRhciBkYXkgb2JqZWN0XHJcblx0XHRjb25zdCBjYWxlbmRhckRheTogQ2FsZW5kYXJEYXkgPSB7XHJcblx0XHRcdGRhdGUsXHJcblx0XHRcdHRhc2tzOiBkYXlUYXNrcyxcclxuXHRcdFx0aXNUb2RheSxcclxuXHRcdFx0aXNTZWxlY3RlZCxcclxuXHRcdFx0aXNQYXN0RHVlLFxyXG5cdFx0XHRpc0Z1dHVyZSxcclxuXHRcdFx0aXNUaGlzTW9udGgsXHJcblx0XHR9O1xyXG5cclxuXHRcdHRoaXMuY2FsZW5kYXJEYXlzLnB1c2goY2FsZW5kYXJEYXkpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0aGUgVUkgZWxlbWVudFxyXG5cdFx0Y29uc3QgZGF5RWwgPSB0aGlzLmNhbGVuZGFyR3JpZEVsLmNyZWF0ZURpdih7IGNsczogXCJjYWxlbmRhci1kYXlcIiB9KTtcclxuXHJcblx0XHRpZiAoIWlzVGhpc01vbnRoKSBkYXlFbC5hZGRDbGFzcyhcIm90aGVyLW1vbnRoXCIpO1xyXG5cdFx0aWYgKGlzVG9kYXkpIGRheUVsLmFkZENsYXNzKFwidG9kYXlcIik7XHJcblx0XHRpZiAoaXNTZWxlY3RlZCkgZGF5RWwuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdGlmIChpc1Bhc3REdWUpIGRheUVsLmFkZENsYXNzKFwicGFzdC1kdWVcIik7XHJcblxyXG5cdFx0Ly8gRGF5IG51bWJlclxyXG5cdFx0Y29uc3QgZGF5TnVtRWwgPSBkYXlFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiY2FsZW5kYXItZGF5LW51bWJlclwiLFxyXG5cdFx0XHR0ZXh0OiBkYXRlLmdldERhdGUoKS50b1N0cmluZygpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gVGFzayBjb3VudCBiYWRnZSAoaWYgdGhlcmUgYXJlIHRhc2tzKVxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5zaG93VGFza0NvdW50cyAmJiBkYXlUYXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IGNvdW50RWwgPSBkYXlFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJjYWxlbmRhci1kYXktY291bnRcIixcclxuXHRcdFx0XHR0ZXh0OiBkYXlUYXNrcy5sZW5ndGgudG9TdHJpbmcoKSxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgY2xhc3MgYmFzZWQgb24gdGFzayBwcmlvcml0eVxyXG5cdFx0XHRjb25zdCBoYXNQcmlvcml0eVRhc2tzID0gZGF5VGFza3Muc29tZShcclxuXHRcdFx0XHQodGFzaykgPT4gdGFzay5tZXRhZGF0YS5wcmlvcml0eSAmJiB0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID49IDJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGhhc1ByaW9yaXR5VGFza3MpIHtcclxuXHRcdFx0XHRjb3VudEVsLmFkZENsYXNzKFwiaGFzLXByaW9yaXR5XCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgY2xpY2sgZXZlbnRcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkYXlFbCwgXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdHRoaXMuc2VsZWN0RGF0ZShkYXRlKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNlbGVjdERhdGUoZGF0ZTogRGF0ZSkge1xyXG5cdFx0dGhpcy5zZWxlY3RlZERhdGUgPSBkYXRlO1xyXG5cclxuXHRcdC8vIElmIHRoZSBzZWxlY3RlZCBkYXRlIGlzIGluIGEgZGlmZmVyZW50IG1vbnRoLCBuYXZpZ2F0ZSB0byB0aGF0IG1vbnRoXHJcblx0XHRpZiAoXHJcblx0XHRcdGRhdGUuZ2V0TW9udGgoKSAhPT0gdGhpcy5kaXNwbGF5ZWRNb250aCB8fFxyXG5cdFx0XHRkYXRlLmdldEZ1bGxZZWFyKCkgIT09IHRoaXMuZGlzcGxheWVkWWVhclxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuZGlzcGxheWVkTW9udGggPSBkYXRlLmdldE1vbnRoKCk7XHJcblx0XHRcdHRoaXMuZGlzcGxheWVkWWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRcdFx0dGhpcy5nZW5lcmF0ZUNhbGVuZGFyKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBKdXN0IHVwZGF0ZSBzZWxlY3RlZCBzdGF0ZVxyXG5cdFx0XHRjb25zdCBhbGxEYXlFbHMgPVxyXG5cdFx0XHRcdHRoaXMuY2FsZW5kYXJHcmlkRWwucXVlcnlTZWxlY3RvckFsbChcIi5jYWxlbmRhci1kYXlcIik7XHJcblx0XHRcdGFsbERheUVscy5mb3JFYWNoKChlbCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHRpZiAoaW5kZXggPCB0aGlzLmNhbGVuZGFyRGF5cy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRheSA9IHRoaXMuY2FsZW5kYXJEYXlzW2luZGV4XTtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0ZGF5LmRhdGUuZ2V0RGF0ZSgpID09PSBkYXRlLmdldERhdGUoKSAmJlxyXG5cdFx0XHRcdFx0XHRkYXkuZGF0ZS5nZXRNb250aCgpID09PSBkYXRlLmdldE1vbnRoKCkgJiZcclxuXHRcdFx0XHRcdFx0ZGF5LmRhdGUuZ2V0RnVsbFllYXIoKSA9PT0gZGF0ZS5nZXRGdWxsWWVhcigpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0ZWwuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0XHRcdFx0ZGF5LmlzU2VsZWN0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0ZWwucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0XHRcdFx0ZGF5LmlzU2VsZWN0ZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyaWdnZXIgY2FsbGJhY2tcclxuXHRcdGlmICh0aGlzLm9uRGF0ZVNlbGVjdGVkKSB7XHJcblx0XHRcdGNvbnN0IHNlbGVjdGVkRGF5VGFza3MgPSB0aGlzLmdldFRhc2tzRm9yRGF0ZShkYXRlKTtcclxuXHRcdFx0dGhpcy5vbkRhdGVTZWxlY3RlZChkYXRlLCBzZWxlY3RlZERheVRhc2tzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbmF2aWdhdGVNb250aChkZWx0YTogbnVtYmVyKSB7XHJcblx0XHR0aGlzLmRpc3BsYXllZE1vbnRoICs9IGRlbHRhO1xyXG5cclxuXHRcdC8vIEhhbmRsZSB5ZWFyIGNoYW5nZVxyXG5cdFx0aWYgKHRoaXMuZGlzcGxheWVkTW9udGggPiAxMSkge1xyXG5cdFx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID0gMDtcclxuXHRcdFx0dGhpcy5kaXNwbGF5ZWRZZWFyKys7XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMuZGlzcGxheWVkTW9udGggPCAwKSB7XHJcblx0XHRcdHRoaXMuZGlzcGxheWVkTW9udGggPSAxMTtcclxuXHRcdFx0dGhpcy5kaXNwbGF5ZWRZZWFyLS07XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5nZW5lcmF0ZUNhbGVuZGFyKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMub25Nb250aENoYW5nZWQpIHtcclxuXHRcdFx0dGhpcy5vbk1vbnRoQ2hhbmdlZCh0aGlzLmRpc3BsYXllZE1vbnRoLCB0aGlzLmRpc3BsYXllZFllYXIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnb1RvVG9kYXkoKSB7XHJcblx0XHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHR0aGlzLmRpc3BsYXllZE1vbnRoID0gdG9kYXkuZ2V0TW9udGgoKTtcclxuXHRcdHRoaXMuZGlzcGxheWVkWWVhciA9IHRvZGF5LmdldEZ1bGxZZWFyKCk7XHJcblx0XHR0aGlzLnNlbGVjdERhdGUodG9kYXkpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRUYXNrc0ZvckRhdGUoZGF0ZTogRGF0ZSk6IFRhc2tbXSB7XHJcblx0XHRjb25zdCBzdGFydE9mRGF5ID0gbmV3IERhdGUoZGF0ZSk7XHJcblx0XHRzdGFydE9mRGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuXHRcdGNvbnN0IGVuZE9mRGF5ID0gbmV3IERhdGUoZGF0ZSk7XHJcblx0XHRlbmRPZkRheS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG5cclxuXHRcdGNvbnN0IHN0YXJ0VGltZXN0YW1wID0gc3RhcnRPZkRheS5nZXRUaW1lKCk7XHJcblx0XHRjb25zdCBlbmRUaW1lc3RhbXAgPSBlbmRPZkRheS5nZXRUaW1lKCk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMudGFza3MuZmlsdGVyKCh0YXNrKSA9PiB7XHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBkdWVEYXRlID0gbmV3IERhdGUodGFzay5tZXRhZGF0YS5kdWVEYXRlKTtcclxuXHRcdFx0XHRkdWVEYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cdFx0XHRcdHJldHVybiBkdWVEYXRlLmdldFRpbWUoKSA9PT0gc3RhcnRUaW1lc3RhbXA7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0VGFza3ModGFza3M6IFRhc2tbXSkge1xyXG5cdFx0dGhpcy50YXNrcyA9IHRhc2tzO1xyXG5cdFx0dGhpcy5nZW5lcmF0ZUNhbGVuZGFyKCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0T3B0aW9ucyhvcHRpb25zOiBQYXJ0aWFsPENhbGVuZGFyT3B0aW9ucz4pIHtcclxuXHRcdHRoaXMub3B0aW9ucyA9IHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zIH07XHJcblx0XHR0aGlzLmdlbmVyYXRlQ2FsZW5kYXIoKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRDdXJyZW50RGF0ZShkYXRlOiBEYXRlKSB7XHJcblx0XHQvLyBVcGRhdGUgdGhlIGN1cnJlbnQgZGF0ZVxyXG5cdFx0dGhpcy5jdXJyZW50RGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xyXG5cdFx0dGhpcy5jdXJyZW50RGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuXHJcblx0XHQvLyBSZWdlbmVyYXRlIHRoZSBjYWxlbmRhciB0byB1cGRhdGUgXCJ0b2RheVwiIGhpZ2hsaWdodGluZ1xyXG5cdFx0dGhpcy5nZW5lcmF0ZUNhbGVuZGFyKCk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==