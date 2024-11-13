async function loadPyodideAndPackages() {
  console.log("Loading Pyodide...");
  // Initialize Pyodide
  window.pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas', 'scikit-learn', 'matplotlib']);
  console.log("Pyodide loaded successfully.");
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

  console.log("File uploaded. Starting to process the file...");
  const reader = new FileReader();
  
  reader.onload = async function(e) {
    const csvData = e.target.result;

    try {
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

        # Prepare data for Plotly
        x_values = X_embedded[:, 0].tolist()
        y_values = X_embedded[:, 1].tolist()
        labels = ['Similar'] * len(similar) + ['Opposite'] * len(opposite) + ['Sideways'] * len(sideways)
      `);

      console.log("Python code executed successfully.");

      // Retrieve the data from Python
      const x_values = pyodide.globals.get('x_values').toJs();
      const y_values = pyodide.globals.get('y_values').toJs();
      const labels = pyodide.globals.get('labels').toJs();

      // Plot using Plotly.js
      console.log("Plotting the graph...");
      const trace = {
        x: x_values,
        y: y_values,
        mode: 'markers',
        type: 'scatter',
        text: labels,
        marker: {
          color: labels.map(label => label === 'Similar' ? 'blue' : (label === 'Opposite' ? 'green' : 'red')),
          size: 10
        }
      };

      const layout = {
        title: "t-SNE Visualization of CSV Data",
        xaxis: { title: "t-SNE Component 1" },
        yaxis: { title: "t-SNE Component 2" }
      };

      Plotly.newPlot('output', [trace], layout);
      console.log("Graph plotted successfully.");

    } catch (error) {
      console.error("Error processing data or generating graph:", error);
    }
  };

  reader.readAsText(file);
}
