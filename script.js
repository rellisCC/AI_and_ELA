// Load Pyodide and required packages
async function loadPyodideAndPackages() {
    console.log("Loading Pyodide...");
    // Specify the indexURL explicitly with the latest available path
    window.pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.22.1/full/"
    });
    await pyodide.loadPackage(['pandas', 'scikit-learn', 'matplotlib']);
    console.log("Pyodide loaded successfully.");
  }
  
  let pyodideReady = loadPyodideAndPackages();  // Start loading Pyodide
  
  async function generateGraph() {
    await pyodideReady; // Ensure Pyodide is ready before running
  
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
        // Escape CSV data for safe embedding in Python code
        const csvDataEscaped = JSON.stringify(csvData);
  
        // Run Python code with Pyodide
        await pyodide.runPythonAsync(`
          import pandas as pd
          from io import StringIO
          from sklearn.feature_extraction.text import TfidfVectorizer
          from sklearn.manifold import TSNE
  
          # Load the CSV data into a DataFrame
          csv_data = ${csvDataEscaped}
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
          tsne = TSNE(n_components=2, random_state=42, perplexity=3, n_iter=300)
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
        const similar = pyodide.globals.get('similar').toJs();   // Retrieve similar text
        const opposite = pyodide.globals.get('opposite').toJs(); // Retrieve opposite text
        const sideways = pyodide.globals.get('sideways').toJs(); // Retrieve sideways text
        const original_text = [...similar, ...opposite, ...sideways]; //new
  
        // Plot using Plotly.js
        console.log("Plotting the graph...");
        const traceSimilar = {
            x: x_values.filter((_, i) => labels[i] === 'Similar'),
            y: y_values.filter((_, i) => labels[i] === 'Similar'),
            mode: 'markers',
            type: 'scatter',
            name: 'Similar',
            text: original_text.filter((_, i) => labels[i] === 'Similar'), // Hover text
            marker: { color: 'blue', size: 10 }
          };
          
          const traceOpposite = {
            x: x_values.filter((_, i) => labels[i] === 'Opposite'),
            y: y_values.filter((_, i) => labels[i] === 'Opposite'),
            mode: 'markers',
            type: 'scatter',
            name: 'Opposite',
            text: original_text.filter((_, i) => labels[i] === 'Opposite'), // Hover text
            marker: { color: 'green', size: 10 }
          };
          
          const traceSideways = {
            x: x_values.filter((_, i) => labels[i] === 'Sideways'),
            y: y_values.filter((_, i) => labels[i] === 'Sideways'),
            mode: 'markers',
            type: 'scatter',
            name: 'Sideways',
            text: original_text.filter((_, i) => labels[i] === 'Sideways'), // Hover text
            marker: { color: 'red', size: 10 }
          };
          
          const layout = {
            title: "t-SNE Visualization of CSV Data",
            xaxis: { title: "t-SNE Component 1" },
            yaxis: { title: "t-SNE Component 2" },
            showlegend: true
          };
          
          Plotly.newPlot('output', [traceSimilar, traceOpposite, traceSideways], layout);
          
        console.log("Graph plotted successfully.");
  
      } catch (error) {
        console.error("Error processing data or generating graph:", error);
      }
    };
  
    reader.readAsText(file);
  }
