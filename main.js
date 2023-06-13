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

let currentCategory = "";
let currentTaskIndex = -1;
let correctAnswers = 0;

// Set variables for commonly used document elements
let btnNextTask = document.getElementById("next-task-btn");
let lblTaskFeedback = document.getElementById("task-feedback");


async function selectCategory(category) {
  currentCategory = category;
  currentTaskIndex = -1;
  correctAnswers = 0;

  document.getElementById("task-selection").hidden = true;
  document.getElementById("statistics").hidden = true;
  document.getElementById("task-display").hidden = false;
  console.log(tasks);

  if (currentCategory === 'external') {
    console.log("External tasks selected.");
  }
  else {
    console.log("Internal tasks selected.");
    //Shuffle Array so tasks are presented in random order
    tasks[currentCategory] = shuffleArray(tasks[currentCategory]);
  }

  displayNextTask();
}

async function displayNextTask() {
  lblTaskFeedback.hidden = true;
  btnNextTask.hidden = true;
  // document.getElementById("next-task-btn").disabled = true;
  currentTaskIndex++;

  if (currentCategory === "external") {
    //External tasks have to be handled differently than internal ones
    if (currentTaskIndex % 10 === 0) {
      try {
        console.log("Fetching external task set " + currentTaskIndex / 10);
        await fetchQuiz(currentTaskIndex / 10); //in externalTasks
      }
      catch (error) {
        console.error("Fetching tasks from server failed: ", error);
      }
    }
    if (currentTaskIndex < externalTasks.length & currentTaskIndex < 32)  //necessary hard-coded limit to prevent unsuitable tasks from being loaded
    {
      displayExternalTask();
    }
    else {
      showStatistics();
    }

  } else {
    //Handling for internal tasks
    if (currentTaskIndex < tasks[currentCategory].length) {
      displayTask(tasks[currentCategory][currentTaskIndex]);
    } else {
      showStatistics();
    }
  }
}

function displayTask(task) {
  btnNextTask.disabled = true;
  btnNextTask.classList.add("disabled"); 

  let answerOptions = task.l.map((text, index) => ({ text, correct: index === 0 }));
  shuffleArray(answerOptions);

  document.getElementById("task-title").textContent = task.a;
  if (currentCategory === 'part-math') {
    katex.render(task.a, document.getElementById("task-title"), {
      throwOnError: false,
    });
  } else {
    document.getElementById("task-title").textContent = task.a;
  }

  document.getElementById("task-content").innerHTML = "";

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
    answerButtons[i].classList.remove("disabled", "correct", "incorrect");
    answerButtons[i].disabled = false;
    answerButtons[i].dataset.correct = answerOptions[i].correct;

    answerButtons[i].onclick = function () {
      submitAnswer(this);
      answerButtons[i].classList.remove("disabled");
      // answerButtons[i].classList.add(correct === true ? "correct" : "incorrect");
    };
  }
}

function displayExternalTask() {
  btnNextTask.disabled = true;
  btnNextTask.classList.add("disabled"); 

  const task = externalTasks[currentTaskIndex];
  console.log(currentTaskIndex + ": " + task.text);
  const answerOptions = task.options.map((text, index) => ({ text, correct: index === 0 }));

  document.getElementById("task-title").textContent = task.title;
  document.getElementById("task-content").innerHTML = task.text;

  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerOptions.length; i++) {
    answerButtons[i].textContent = answerOptions[i].text;
    answerButtons[i].classList.remove("disabled", "correct", "incorrect");
    answerButtons[i].disabled = false;
    answerButtons[i].dataset.correct = answerOptions[i].correct;

    answerButtons[i].onclick = function () {
      checkAnswer(currentTaskIndex + 2, i)
        .then(returnedResult => {
          console.log(returnedResult);
          let correct = returnedResult.success;
          showAnswerResult(correct);

          answerButtons[i].classList.remove("disabled");
          answerButtons[i].classList.add(correct === true ? "correct" : "incorrect");
        })
    };
  }
}

function submitAnswer(answerButton) {
  if (btnNextTask.hidden) {
    let correct = (answerButton.dataset.correct === 'true');
    showAnswerResult(correct);

    let answerButtons = document.getElementsByClassName("answer-btn");
    for (let i = 0; i < answerButtons.length; i++) {
      answerButtons[i].classList.add(answerButtons[i] === answerButton ? (correct ? "correct" : "incorrect") : "disabled");
      // answerButtons[i].disabled = true;
    }
  }
}

function showAnswerResult(correct) {
  btnNextTask.disabled = false;
  btnNextTask.classList.remove("disabled"); 

  // document.getElementById("next-task-btn").disabled = false;
  let answerButtons = document.getElementsByClassName("answer-btn");
  for (let i = 0; i < answerButtons.length; i++) {
    answerButtons[i].classList.add("disabled");
    answerButtons[i].disabled = true;
  }

  if (correct === true) {
    correctAnswers++;
    document.getElementById("correct-answers").textContent = correctAnswers;


  }
  lblTaskFeedback.textContent = correct ? "Correct!" : "Incorrect";
  lblTaskFeedback.hidden = false;
  btnNextTask.hidden = false;
}

function showStatistics() {
  document.getElementById("task-display").hidden = true;
  document.getElementById("statistics").hidden = false;

  let totalTasks = currentTaskIndex;
  document.getElementById("total-tasks").textContent = totalTasks;

  let percentageCorrectAnswers = (correctAnswers / totalTasks) * 100;
  document.getElementById("percent-correct-answers").textContent = percentageCorrectAnswers.toFixed(2) + '%';
}

function returnToStart() {
  toggleNavMenu();
  document.getElementById("task-selection").hidden = false;
  document.getElementById("task-display").hidden = true;
  document.getElementById("statistics").hidden = true;
  document.getElementById("categories-nav").hidden = false; // Show the navigation panel
  lblTaskFeedback.hidden = true; // Hide the feedback
  btnNextTask.hidden = true; // Hide the Next button

}

function toggleNavMenu() {

  if (matchMedia('all and (orientation: portrait)').matches) {
    let navMenu = document.getElementById("categories-nav");
    navMenu.style.display = (navMenu.style.display === "none" || navMenu.style.display === "") ? "block" : "none";
    let overlay = document.getElementById("overlay");
    overlay.style.display = (overlay.style.display === "none" || overlay.style.display === "") ? "block" : "none";
  }

}

function closeNavMenu(category) {
  let navMenu = document.getElementById("categories-nav");
  navMenu.style.display = "";

  if (matchMedia('all and (orientation: portrait)').matches) {
    let overlay = document.getElementById("overlay");
    overlay.style.display = "";
  }
  selectCategory(category)
}

function toggleButtonDisable(button)
{
  //button.disabled = !button.disabled;
  //button.classList.
}

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
