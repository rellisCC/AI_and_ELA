async function loadPyodideAndPackages() {
  // Initialize Pyodide
  window.pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas', 'scikit-learn', 'matplotlib']);
}

// Load Pyodide and required packages
loadPyodideAndPackages();

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

    // Run Python code with Pyodide
    await pyodide.runPythonAsync(`
      import pandas as pd
      from io import StringIO
      from sklearn.feature_extraction.text import TfidfVectorizer
      from sklearn.manifold import TSNE
      import matplotlib.pyplot as plt

      # Load the CSV data into a DataFrame
      csv_data = """${csvData}"""
      data = pd.read_csv(StringIO(csv_data))

      # Extract the full dataset from each category
      similar = data['Similar'].dropna().tolist()
      opposite = data['Opposite'].dropna().tolist()
      sideways = data['Sideways'].dropna().tolist()

      # Combine all text data for TF-IDF vectorization
      text_data = similar + opposite + sideways

      # Vectorize the text data using TF-IDF
      vectorizer = TfidfVectorizer()
      X_tfidf = vectorizer.fit_transform(text_data)

      # Apply t-SNE using the full dataset
      tsne = TSNE(n_components=2, random_state=42, perplexity=3, max_iter=300)
      X_embedded = tsne.fit_transform(X_tfidf.toarray())

      # Select only the first 15 points from each category for plotting
      limited_indices = (
          list(range(15)) +
          list(range(len(similar), len(similar) + 15)) +
          list(range(len(similar) + len(opposite), len(similar) + len(opposite) + 15))
      )

      limited_X_embedded = X_embedded[limited_indices]
      limited_colors = ['blue'] * 15 + ['green'] * 15 + ['red'] * 15

      # Prepare data for Plotly
      x_values = [point[0] for point in limited_X_embedded]
      y_values = [point[1] for point in limited_X_embedded]
      labels = ['Similar'] * 15 + ['Opposite'] * 15 + ['Sideways'] * 15
    `);

    // Retrieve the data from Python
    const x_values = pyodide.globals.get('x_values').toJs();
    const y_values = pyodide.globals.get('y_values').toJs();
    const labels = pyodide.globals.get('labels').toJs();

    // Plot using Plotly.js
    const trace = {
      x: x_values,
      y: y_values,
      mode: 'markers',
      type: 'scatter',
      text: labels,
      marker: {
        color: ['blue', 'green', 'red'],
        size: 10
      }
    };

    const layout = {
      title: "t-SNE Visualization of CSV Data",
      xaxis: { title: "t-SNE Component 1" },
      yaxis: { title: "t-SNE Component 2" }
    };

    Plotly.newPlot('output', [trace], layout);
  };

  reader.readAsText(file);
}
