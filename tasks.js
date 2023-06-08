"use strict"

//internal Tasks
let tasks;
fetch('resources/tasks.json.txt')
  .then(response => response.json())
  .then(data => tasks = data)
  .catch((error) => {
    console.error('Error:', error);
  });

//external Tasks
let externalTasks = [];
const user = "test@gmail.com";
const pass = "secret";

async function fetchQuiz(id) {
  const url = `https://irene.informatik.htw-dresden.de:8888/api/quizzes?page=${id}`;
  const headers = new Headers();
  headers.append('Authorization', 'Basic ' + btoa(user + ':' + pass));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      const quiz = await response.json();
      externalTasks = externalTasks.concat(quiz.content); // Append new tasks to externalTasks
      console.log("Fetched external tasks");
      return externalTasks;
    }
  } catch (error) {
    console.error('Fetching quiz failed: ', error);
  }
}

async function checkAnswer(taskId, answerId) {
  console.log("Checking answer...");
  const url = `https://irene.informatik.htw-dresden.de:8888/api/quizzes/${taskId}/solve`;
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', 'Basic ' + btoa(user + ':' + pass));
  const body = JSON.stringify([answerId]);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body, // Convert array to JSON string.
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      const result = await response.json(); // Parse the JSON response.
      return result;
    }
  } catch (error) {
    console.error('Checking answer failed: ', error);
  }
}

