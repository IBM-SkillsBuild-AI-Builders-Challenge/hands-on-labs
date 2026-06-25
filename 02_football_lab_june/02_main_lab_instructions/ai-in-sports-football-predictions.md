![Predict the Outcome of a Football Match with IBM Bob](images/predict-football-title.png)

> **From "I don't code" to "I built an AI app!" - Bob makes it happen**

## About IBM Bob - Your AI coding partner

IBM Bob lets you:

- **Write code for you** - Just describe what you need, Bob writes it.
- **Understand your project** - Bob reads and comprehends your entire codebase.
- **Debug errors** - Paste an error message, Bob fixes it.
- **Explain concepts** - Ask Bob to explain any code or concept.
- **Work in any language** - Write in Python, JavaScript, Java, and more.
- **Set up environments** - Bob handles installations and configurations.

## Learning objectives

After completing this lab, you should be able to:
- Prompt IBM Bob to generate Python code for data science workflows.
- Build and evaluate a machine learning model for sports prediction.
- Apply feature engineering techniques to historical sports data.
- Train and evaluate the machine learning model.

**You don't need to be a coding expert** - Bob handles the technical details while you focus on learning and building!

## About this lab

In this lab, you'll build a **complete machine learning application** that predicts soccer match winners using data analysis and machine learning in Jupyter notebooks.

Bob writes all the code for you! You will:
- Read what each step does.
- Copy the prompt to Bob.
- Paste Bob's code and run it to analyze the data and build a machine learning model.
- Review the results.

No deep Python, machine learning, or data science knowledge needed - Leave that to Bob!

## About the dataset

This lab uses the datasets from [Kaggle dataset: International football results from 1872 to 2026](https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017).

This dataset includes 49,016 results of international football matches starting from the very first official match in 1872 up to 2026. The matches range from World Cup to Wild Cup to regular friendly matches. The matches are strictly men's full internationals and the data does not include Olympic Games or matches where at least one of the teams was the nation's B-team, U-23 or a league select team.

The results.csv dataset includes the following columns:

- date - date of the match
- home_team - the name of the home team
- away_team - the name of the away team
- home_score - full-time home team score including extra time, not including penalty-shootouts
- away_score - full-time away team score including extra time, not including penalty-shootouts
- tournament - the name of the tournament
- city - the name of the city/town/administrative unit where the match was played
- country - the name of the country where the match was played
- neutral - TRUE/FALSE column indicating whether the match was played at a neutral venue

## Estimated time

**60-90 minutes**

## Prerequisites

**Tip:** Right-click the following link, and open the page in a new tab.

Complete the prerequisite tasks of [Get started with IBM Bob](get-started-with-ibm-bob.md)

<a name="top"></a>

## Contents

- [Task 1: Open Bob in your working directory](#task01)
- [Task 2: Clone the lab repository to your working directory](#task02)
- [Task 3: Set up your environment](#task03)
- [Task 4: Start Jupyter Lab to run the notebook](#task04)
- [Task 5: Clean up when you're done](#task05)

<a name="task01"></a>

## Task 1: Open Bob in your working directory

**Note:** This is a manual step, Bob can't do it for security reasons.

Follow these steps to create a directory and open that directory in Bob:

1. Decide a location and name for directory for the lab work.
2. Create the directory.
3. Launch Bob, and open the above directory.
1. Verify that you are in *Ask* mode.

   ![Bob modes](images/bob-panel.png)

1. Copy and paste the following prompt to Bob and review the response:
    ```
    Hey Bob, What's my current working directory?
    ```

[Back to the top](#top)

<a name="task02"></a>

## Task 2: Clone the lab repository to your working directory 

Follow these steps to clone the repository that contains all of the lab files:

1. In Bob's chat panel, copy and paste the following prompt:

    ```
    I am starting a coding lab. Can you clone this repository and tell me what's in it?
    Repository: https://github.com/IBM-SkillsBuild-AI-Builders-Challenge/hands-on-labs/tree/main/02_football_lab_june
    Branch: main
    ```

    **What Bob will do:**
    - Request your approval to switch into "Code" mode.
    - Ask how you want to autneticate with Github. If so refer the following instructions. Note that public repositories may not require any authentication.
    - Request permission to read the files it created.
    - Summarize for you the details of the lab and it might even suggest the next step. For the purposes of this lab, you may ignore the suggestion, proceed to next step below.

1. If Bob asks about authentication, follow these steps:
    1. Copy and paste the following prompt: 

       ```
       I have a personal access token
       ```

    1. Replace your username and access token in the following prompt, and then submit the prompt to Bob:

        ```
        [YOUR_USERNAME]
        [YOUR_PERSONAL_ACCESS_TOKEN]
        ```

1. If you enter any problems, Ask Bob for help.

[Back to the top](#top)

<a name="task03"></a>

## Task 3: Set up your environment

Follow these steps to set up your environment to complete this lab:

In Bob's chat panel, copy and paste the following prompt:

```
Great! Now please setup the necessary environment for this lab, but don't install the packages that go inside Jupyter Lab - I'll do that part while following the lab.
```

**What Bob will do:**
- Install Jupyter Lab itself (the application).
- Set up the basic environment.
- Prepare everything needed to run the lab.

**Note:** Bob will NOT install the lab-specific packages (like pandas, scikit-learn, etc.) - you'll install those yourself by following the instructions in the Jupyter notebook.

[Back to the top](#top)

<a name="task04"></a>

## Task 4: Start Jupyter Lab to run the notebook

1. In Bob's chat panel, copy and paste the following prompt:

   ```
   Please run Jupyter Lab for me so that I can start working on the lab. Once ready, give me the URL that I should open in a browser.
   ```

   **What Bob will do:**
   - Ask your permission to run the command to start Jupyter Lab.
   - Start the Jupyter Lab server.
   - Provide you with the access URL. (looks like:  http://localhost:8889/lab?token=be593c982208307739c1ca7501d09536a0c5de8a658edc07)
     **Note:** You may need to click **Proced while running** to get the clean URL info.

1. Click the link that Bob provides (or copy-paste it into your browser). Your browser will open Jupyter Lab.
1. Find and open the lab notebook (`corelab.ipynb`).
1. Follow the instructions in the notebook. Work through each cell, asking Bob for help when needed.

**Tip:** Keep Bob's chat open while you work through the lab. You can ask Bob questions, request code for specific cells, or get help with errors!

<!-- From Sharyn: In the notebook, we need to tell the student to click save in Bob to save the py files with the code, or we can we tell bob to automatically save the py file with the code? -->

<!-- From Sharyn: Should we have a final cell that predicts the outcome a specific matchup? Such as Brazil vs Spain? 
```
write code to test the model to predict the outcome of a matchup between Brazil and Spain?
-->

[Back to the top](#top)

<a name="task05"></a>

## Task 5: Clean up when you're done

When you've finished the lab, copy and paste the following prompt into Bob's chat panel:

```
I'm all done with the lab! Please stop Jupyter Lab and clean up for me.
```

**What Bob will do:**
- Stop the Jupyter Lab server.
- Clean up any running processes.
- Keep your saved work.

[Back to the top](#top)

<a name="summary"></a>

## Summary

In this lab, you used IBM Bob to build a **complete machine learning application** that predicts soccer match winners using data analysis and machine learning in Jupyter notebooks.

### What you learned

Now that you have completed this lab, you should be able to:

- Prompt Bob to help you write machine learning code.
- Debug any issues you encounter.
- Run the code generated by Bob in Jupyter Lab.

[Back to the top](#top)

<a name="additional-resources"></a>

## Additional resources

- [IBM Bob documentation](https://bob.ibm.com/docs)
