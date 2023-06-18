"use strict";

// Register the service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then((registration) => {
      console.log("Service Worker registered:", registration);
    })
    .catch((error) => {
      console.log("Service Worker registration failed:", error);
    });
}

//Global variables for keeping track of stuff
const externalTasksLimit = 32; //necessary hard-coded limit to prevent unsuitable tasks from being loaded
let currentCategory = "";
let currentTaskIndex = -1;
let correctAnswers = 0;

// Set variables to make referenicng commonly used document elements easier
let lblCurrentTask = document.getElementById('current-task');
let lblCorrectTasks = document.getElementById('correct-tasks');
let lblTaskTitle = document.getElementById("task-title");
let lblRemainingTasks = document.getElementById("remaining-tasks");
let btnNextTask = document.getElementById("next-task-btn");
let navCategories = document.getElementById("categories-nav");
let sctnTaskSelection = document.getElementById("task-selection");
let sctnTaskDisplay = document.getElementById("task-display");
let sctnStatistics = document.getElementById("statistics");
let ovlOverlay = document.getElementById("overlay");


async function selectCategory(category) {
  currentCategory = category;
  currentTaskIndex = -1;
  correctAnswers = 0;

  // document.getElementById("task-selection").hidden = true;
  sctnTaskSelection.hidden = true;
  sctnStatistics.hidden = true;
  sctnTaskDisplay.hidden = false;
  showAside();
  console.log(tasks);

  if (currentCategory === 'external') {
    // console.log("External tasks selected.");
    //No need to do anything else here as Server-Side tasks won't be shuffled
  }
  else {
    // console.log("Internal tasks selected.");
    //Shuffle Array so tasks are presented in random order
    tasks[currentCategory] = shuffleArray(tasks[currentCategory]);
  }

  displayNextTask();
}

//Displays the next task and its answer options
async function displayNextTask() {
  btnNextTask.hidden = true;
  currentTaskIndex++;
  updateAside();

  //External tasks have to be handled differently than internal ones
  if (currentCategory === "external") {
    //Fetch new pack of 10 external questions once current set is answered or we're starting out
    if (currentTaskIndex % 10 === 0) {
      try {
        console.log("Fetching external task set " + currentTaskIndex / 10);
        await fetchQuiz(currentTaskIndex / 10); //in externalTasks
      }
      catch (error) {
        console.error("Fetching tasks from server failed: ", error);
      }
    }
    if (currentTaskIndex < externalTasks.length & currentTaskIndex < externalTasksLimit) {
      if (currentTaskIndex + 1 === externalTasksLimit) {
        btnNextTask.textContent = "Finish";
      }
      displayExternalTask();
    }
    else {
      showStatistics();
    }

  } else {
    //Handling for internal tasks
    //Display task if there are any left, else end quiz and show stats
    if (currentTaskIndex < tasks[currentCategory].length) {
      if (currentTaskIndex + 1 === tasks[currentCategory].length) {
        btnNextTask.textContent = "Finish";
      }
      displayTask(tasks[currentCategory][currentTaskIndex]);
    } else {
      showStatistics();
    }
  }
}

//Display locally saved tasks
function displayTask(task) {
  btnNextTask.disabled = true;
  btnNextTask.classList.add("disabled");

  //Transform local task to array and remember which answer option is correct (always the first one, os the one where index is 0)
  let answerOptions = task.l.map((text, index) => ({ text, correct: index === 0 }));
  shuffleArray(answerOptions);

  //If maths render using KaTeX, else simply display as text
  if (currentCategory === 'part-math') {
    katex.render(task.a, lblTaskTitle, {
      throwOnError: false,
    });
  } else {
    lblTaskTitle.textContent = task.a;
  }

  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerOptions.length; i++) {
    // Render the option with KaTeX if the category is 'part-math'
    if (currentCategory === 'part-math') {
      katex.render(answerOptions[i].text, answerButtons[i], {
        throwOnError: false,
      });
    } else {
      answerButtons[i].textContent = answerOptions[i].text;
    }
    //reset answer option buttons 
    answerButtons[i].classList.remove("disabled", "correct", "incorrect");
    answerButtons[i].disabled = false;
    //set attribute for button with correct answer
    answerButtons[i].dataset.correct = answerOptions[i].correct;

    answerButtons[i].onclick = function () {
      submitAnswer(this);
      //Remove disabled attribute beacuse we need to see whether this button is correct or incorrect
      answerButtons[i].classList.remove("disabled");
    };
  }
}

//Display external tasks. They require a separate function since their handling is different to local tasks
//For example, they don't need to be shuffled and the answer is checked externally
function displayExternalTask() {
  //Disable going to next task
  btnNextTask.disabled = true;
  btnNextTask.classList.add("disabled");

  const task = externalTasks[currentTaskIndex];
  const answerOptions = task.options.map((text, index) => ({ text, correct: index === 0 }));

  lblTaskTitle.textContent = task.text;

  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerOptions.length; i++) {
    answerButtons[i].textContent = answerOptions[i].text;
    answerButtons[i].classList.remove("disabled", "correct", "incorrect");
    answerButtons[i].disabled = false;
    answerButtons[i].dataset.correct = answerOptions[i].correct;

    answerButtons[i].onclick = function () {
      checkAnswer(currentTaskIndex + 2, i)
        .then(returnedResult => {
          // console.log(returnedResult);
          let correct = returnedResult.success; //true||false
          showAnswerResult(correct);
          //Remove disabled attribute beacuse we need to see whether this button is correct or incorrect
          answerButtons[i].classList.remove("disabled");
          answerButtons[i].classList.add(correct === true ? "correct" : "incorrect");
        })
    };
  }
}

//Check answer (for local tasks only!)
function submitAnswer(answerButton) {
  let correct = (answerButton.dataset.correct === 'true');
  showAnswerResult(correct);

  //Set the 
  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerButtons.length; i++) {
    //Set answerButton to correct or incorrect, depending on user answer
    if (answerButtons[i] === answerButton) {
      answerButtons[i].classList.add(correct ? "correct" : "incorrect");
    }
  }
}

//Show result of answer, format buttons correctly (local and external tasks)
function showAnswerResult(correct) {
  btnNextTask.disabled = false;
  btnNextTask.classList.remove("disabled");
  btnNextTask.hidden = false;

  //Set all answer option buttons to disabled
  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerButtons.length; i++) {
    answerButtons[i].classList.add("disabled");
    answerButtons[i].disabled = true;
  }
  //Increase count of correct answers, if answer was correct
  if (correct === true) {
    correctAnswers++;
  }
  updateAside();
}

//Show statistics (tasks, correct tasks, percentage of correct tasks) at end of round
function showStatistics() {
  document.getElementById("task-display").hidden = true;
  document.getElementById("statistics").hidden = false;
  hideAside();

  document.getElementById("total-tasks").textContent = currentTaskIndex;
  document.getElementById("correct-answers").textContent = correctAnswers;

  //calculate and show percentage of correct answers
  let percentageCorrectAnswers = (correctAnswers / currentTaskIndex) * 100;
  document.getElementById("percent-correct-answers").textContent = percentageCorrectAnswers.toFixed(2) + '%';
}

function showAside() {
  lblCorrectTasks.hidden = false;
  lblCurrentTask.hidden = false;
  lblRemainingTasks.hidden = false;
}
function hideAside() {
  lblCorrectTasks.hidden = true;
  lblCurrentTask.hidden = true;
  lblRemainingTasks.hidden = true;
}

//Reset elements to default and show task selection again, currently basically identical to reloading the page
function returnToStart() {
  toggleNavMenu();
  hideAside();
  btnNextTask.textContent = "Next Task"; //reset text of next task button
  sctnTaskSelection.hidden = false; //show task selection
  sctnTaskDisplay.hidden = true; //hide task display
  sctnStatistics.hidden = true; //hide statisctics
  navCategories.hidden = false; // Show the navigation panel
  btnNextTask.hidden = true; // Hide the Next button
}

//Toggles navigation menu on mobile/portrait view
function toggleNavMenu() {
  if (matchMedia('all and (orientation: portrait)').matches) {
    navCategories.style.display = (navCategories.style.display === "none" || navCategories.style.display === "") ? "block" : "none";
    ovlOverlay.style.display = (ovlOverlay.style.display === "none" || ovlOverlay.style.display === "") ? "block" : "none";
  }
}

//Close navigation menu (on mobile) and start selected task category
function closeNavMenu(category) {
  //hide overlay, nav menu on mobile/portrait
  if (matchMedia('all and (orientation: portrait)').matches) {
    navCategories.style.display = "";
    overlay.style.display = "";
  }
  selectCategory(category)
}

//Fisher-Yates (aka Knuth) Shuffle algorithm to shuffle an array
function shuffleArray(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

//Update sidebar with current task, correct answers and remaining tasks
function updateAside() {
  lblCurrentTask.textContent = currentTaskIndex + 1;
  lblCorrectTasks.textContent = correctAnswers;
  if (currentCategory != "external") {
    lblRemainingTasks.textContent = (tasks[currentCategory].length - currentTaskIndex - 1);
  }
  else {
    lblRemainingTasks.textContent = (externalTasksLimit - currentTaskIndex - 1);
  }
}
