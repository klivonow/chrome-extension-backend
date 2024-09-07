#!/bin/bash

# Ensure we're in the project directory
cd chrome-extension-backend

# Initialize a new Git repository
git init

# Add all files to Git
git add .

# Commit the files
git commit -m "Initial commit: Chrome extension backend setup"

# Prompt for GitHub username
read -p "Enter your GitHub username: " github_username

# Prompt for repository name
read -p "Enter the name for your new GitHub repository: " repo_name

# Create a new repository on GitHub using the GitHub CLI
# Note: This requires the GitHub CLI to be installed and authenticated
gh repo create "$repo_name" --public --source=. --remote=origin

# Push the code to the new GitHub repository
git push -u origin main

echo "Your backend application has been uploaded to GitHub at: https://github.com/$github_username/$repo_name"