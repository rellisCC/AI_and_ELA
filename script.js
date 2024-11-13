# Step 1: Inport necessary files
from google.colab import files
uploaded = files.upload()

# Step 2: Import necessary libraries
import pandas as pd
import numpy as np  # Import NumPy to handle arrays
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt

# Step 3: Load the uploaded CSV into a DataFrame
file_name = list(uploaded.keys())[0]  # Get uploaded filename
data = pd.read_csv(file_name, encoding='ISO-8859-1')

# Step 1: Extract the full dataset from each category
similar = data['Similar'].dropna().tolist()
opposite = data['Opposite'].dropna().tolist()
sideways = data['Sideways'].dropna().tolist()

# Combine all text data for TF-IDF vectorization
text_data = similar + opposite + sideways

# Step 2: Vectorize the text data using TF-IDF
vectorizer = TfidfVectorizer()
X_tfidf = vectorizer.fit_transform(text_data)

# Step 3: Apply t-SNE using the full dataset
tsne = TSNE(n_components=2, random_state=42, perplexity=3, max_iter=300)
X_embedded = tsne.fit_transform(X_tfidf.toarray())

# Step 4: Select only the first 15 points from each category for plotting
limited_indices = (
    list(range(15)) +
    list(range(len(similar), len(similar) + 15)) +
    list(range(len(similar) + len(opposite), len(similar) + len(opposite) + 15))
)

limited_X_embedded = X_embedded[limited_indices]
limited_labels = [str(i + 1) for i in range(len(limited_indices))]
limited_colors = ['blue'] * 15 + ['green'] * 15 + ['red'] * 15

# Step 5: Plot the initial graph
def plot_initial_graph():
    """Plots the initial t-SNE graph with 15 points from each category."""
    plt.figure(figsize=(8, 5), dpi=100)
    plt.scatter(limited_X_embedded[:, 0], limited_X_embedded[:, 1],
                c=limited_colors, marker='o', s=50, alpha=0.7)

    # Annotate the original points
    for i, label in enumerate(limited_labels):
        plt.text(limited_X_embedded[i, 0], limited_X_embedded[i, 1],
                 label, fontsize=9, ha='right', va='bottom', color='black')

    # Add a legend
    legend_labels = ['Similar', 'Opposite', 'Sideways']
    handles = [plt.Line2D([0], [0], marker='o', color='w',
                          markerfacecolor=c, markersize=10)
               for c in ['blue', 'green', 'red']]
    plt.legend(handles, legend_labels, title='Categories')

    # plt.title("t-SNE Visualization: Initial Graph Showing 15 from each Category")
    plt.title(f"First 15 items for each category in {file_name}")
    plt.xlabel("t-SNE Component 1")
    plt.ylabel("t-SNE Component 2")
    plt.show()

# Plot the initial graph
plot_initial_graph()

# @title Step 4: Click play. A field will open where you can write your own text. Then press enter. The graph will be redrawn with your text labeled with a purple dot.
from sklearn.neighbors import NearestNeighbors

# Step 6: Create a NearestNeighbors model using the full TF-IDF data
nn_model = NearestNeighbors(n_neighbors=1).fit(X_tfidf)

def add_new_point(new_text):
    """Add a new input text and project it onto the t-SNE space."""
    # Vectorize the new input
    new_tfidf = vectorizer.transform([new_text])

    # Find the nearest neighbor in the original TF-IDF space
    _, indices = nn_model.kneighbors(new_tfidf)
    new_point = X_embedded[indices[0][0]]  # Use nearest neighbor's coordinates

    # Plot the graph with the new point added
    plot_graph_with_new_point(new_point)

def plot_graph_with_new_point(new_point):
    """Plots the original graph with the new point added."""
    plt.figure(figsize=(8, 5), dpi=100)

    # Plot the original points
    plt.scatter(limited_X_embedded[:, 0], limited_X_embedded[:, 1],
                c=limited_colors, marker='o', s=50, alpha=0.7)

    # Annotate the original points
    for i, label in enumerate(limited_labels):
        plt.text(limited_X_embedded[i, 0], limited_X_embedded[i, 1],
                 label, fontsize=9, ha='right', va='bottom', color='black')

    # Plot the new point in purple
    plt.scatter(new_point[0], new_point[1], c='purple', marker='o', s=50, alpha=0.7)
    plt.text(new_point[0], new_point[1], "New", fontsize=9,
             ha='right', va='bottom', color='black')

    # Add a legend
    legend_labels = ['Similar', 'Opposite', 'Sideways', 'New Entry']
    handles = [plt.Line2D([0], [0], marker='o', color='w',
                          markerfacecolor=c, markersize=10)
               for c in ['blue', 'green', 'red', 'purple']]
    plt.legend(handles, legend_labels, title='Categories')

    plt.title("t-SNE Visualization with New Entry")
    plt.xlabel("t-SNE Component 1")
    plt.ylabel("t-SNE Component 2")
    plt.show()

# Example usage: Get new text input from the user
new_data_entry = input("Enter new text data to plot: ")
add_new_point(new_data_entry)



// Check for Pyodide support if you need Python in the browser
async function loadPyodideAndPackages() {
  await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.1/full/",
  });
}

async function generateGraph() {
  const fileInput = document.getElementById('csvUpload');
  const file = fileInput.files[0];
  
  if (!file) {
    alert("Please upload a CSV file first!");
    return;
  }

  const reader = new FileReader();
  
  reader.onload = async function(e) {
    const csvData = e.target.result;

    // Process the CSV data in Pyodide or with JavaScript libraries here

    // Example Plotly.js plot
    const trace = {
      x: [1, 2, 3, 4, 5],  // Replace with processed CSV data
      y: [1, 4, 9, 16, 25],  // Replace with processed CSV data
      mode: 'lines+markers'
    };
    
    const layout = {
      title: 'Interactive Graph from CSV'
    };

    Plotly.newPlot('output', [trace], layout);
  };

  reader.readAsText(file);
}
