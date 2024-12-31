// Load Pyodide and required packages
async function loadPyodideAndPackages() {
  console.log("Loading Pyodide...");
  window.pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.22.1/full/"
  });
  await pyodide.loadPackage(['pandas', 'scikit-learn', 'matplotlib']);
  console.log("Pyodide loaded successfully.");
}

let pyodideReady = loadPyodideAndPackages(); // Start loading Pyodide

function updateFileLabel() {
  const fileInput = document.getElementById('csvUpload');
  const fileLabel = document.getElementById('fileLabel');
  fileLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : 'No file selected';
}
// Display the chosen file name (either from the dropdown or file upload)
function displayFileName(source) {
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  if (source === 'dropdown') {
    const dropdown = document.getElementById('preloadedFiles');
    const selectedFile = dropdown.options[dropdown.selectedIndex].text;
    fileNameDisplay.textContent = `Selected file from dropdown: ${selectedFile}`;
  } else if (source === 'upload') {
    const fileInput = document.getElementById('csvUpload');
    if (fileInput.files[0]) {
      const fileName = fileInput.files[0].name;
      fileNameDisplay.textContent = `Uploaded file: ${fileName}`;
    }
  }
}

// Modify existing dropdown and file input onchange events
async function handleFileSelection() {
  const dropdown = document.getElementById('preloadedFiles');
  const selectedFile = dropdown.value;

  if (selectedFile) {
    displayFileName('dropdown'); // Display the selected file name from the dropdown
    try {
      const response = await fetch(`files/${selectedFile}`);
      if (!response.ok) {
        throw new Error(`File not found: ${selectedFile}`);
      }
      const csvData = await response.text();
      loadCSVData(csvData);
    } catch (error) {
      console.error("Error fetching the file:", error);
      alert("Failed to load the selected file. Please ensure the file exists in the 'files/' directory.");
    }
  }
}

function updateFileLabel() {
  displayFileName('upload'); // Display the selected file name from the file input
}

// Load CSV data
function loadCSVData(csvData) {
  window.csvData = csvData;
  console.log("CSV data loaded:", csvData);
}

// Generate the graph from CSV data
async function generateGraph() {
  await pyodideReady;

  const fileInput = document.getElementById('csvUpload');
  const selectedFile = document.getElementById('preloadedFiles').value;
  const loadingMessage = document.getElementById('loadingMessage');

  // Show the loading message
  loadingMessage.style.display = 'block';

  if (selectedFile) {
    processCSVData(window.csvData).finally(() => {
      // Hide the loading message
      loadingMessage.style.display = 'none';
    });
  } else if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      processCSVData(e.target.result).finally(() => {
        // Hide the loading message
        loadingMessage.style.display = 'none';
      });
    };
    reader.readAsText(fileInput.files[0]);
  } else {
    alert("Please select or upload a CSV file!");
    // Hide the loading message if no file is selected
    loadingMessage.style.display = 'none';
  }
}


// Process CSV Data and generate the graph
async function processCSVData(csvData) {
  try {
    const csvDataEscaped = JSON.stringify(csvData);

    // Run Python code with Pyodide
    await pyodide.runPythonAsync(`
      import pandas as pd
      from io import StringIO
      from sklearn.feature_extraction.text import TfidfVectorizer
      from sklearn.manifold import TSNE
      from sklearn.neighbors import NearestNeighbors

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
      tsne = TSNE(n_components=2, random_state=42, perplexity=40, n_iter=1000, learning_rate=100)
      X_embedded = tsne.fit_transform(X_tfidf.toarray())

      # Prepare data for Plotly
      x_values = X_embedded[:, 0].tolist()
      y_values = X_embedded[:, 1].tolist()
      labels = ['Similar'] * len(similar) + ['Opposite'] * len(opposite) + ['Sideways'] * len(sideways)

      # Save vectorizer and embeddings globally for reuse
      global tfidf_vectorizer, tsne_embeddings
      tfidf_vectorizer = vectorizer
      tsne_embeddings = X_embedded
    `);

    console.log("Python code executed successfully.");

    // Retrieve data from Pyodide
    const x_values = pyodide.globals.get('x_values').toJs();
    const y_values = pyodide.globals.get('y_values').toJs();
    const labels = pyodide.globals.get('labels').toJs();
    const similar = pyodide.globals.get('similar').toJs();
    const opposite = pyodide.globals.get('opposite').toJs();
    const sideways = pyodide.globals.get('sideways').toJs();
    const original_text = [...similar, ...opposite, ...sideways];

    // Define traces for each category
    const traceSimilar = {
      x: x_values.filter((_, i) => labels[i] === 'Similar'),
      y: y_values.filter((_, i) => labels[i] === 'Similar'),
      mode: 'markers',
      type: 'scatter',
      name: 'Similar',
      text: original_text.filter((_, i) => labels[i] === 'Similar'),
      marker: { color: '#648fff', size: 10 }, // Blue, using colos from observablehq.com
      hoverinfo: 'text', // Only show the text
      hovertemplate: '<b style="background-color:#648fff;color:white;padding:5px;">%{text}</b><extra></extra>'
    };

    const traceOpposite = {
      x: x_values.filter((_, i) => labels[i] === 'Opposite'),
      y: y_values.filter((_, i) => labels[i] === 'Opposite'),
      mode: 'markers',
      type: 'scatter',
      name: 'Opposite',
      text: original_text.filter((_, i) => labels[i] === 'Opposite'),
      marker: { color: '#dc267f', size: 10 }, // Magenta
      hoverinfo: 'text', // Only show the text
      hovertemplate: '<b style="background-color:#dc267f;color:white;padding:5px;">%{text}</b><extra></extra>'
    };

    const traceSideways = {
      x: x_values.filter((_, i) => labels[i] === 'Sideways'),
      y: y_values.filter((_, i) => labels[i] === 'Sideways'),
      mode: 'markers',
      type: 'scatter',
      name: 'Sideways',
      text: original_text.filter((_, i) => labels[i] === 'Sideways'),
      marker: { color: '#ffb000', size: 10 }, // Gold
      hoverinfo: 'text', // Only show the text
      hovertemplate: '<b style="background-color:#ffb000;color:black;padding:5px;">%{text}</b><extra></extra>'
    };

    const layout = {
      title: "A t-SNE Visualization of Possible Phrases for Your Selected Phrase",
      xaxis: { title: "" },
      yaxis: { title: "" },
      showlegend: true,
      colorway: ['#648fff', '#dc267f', '#ffb000', '#000000'],
    };

    Plotly.newPlot('output', [traceSimilar, traceOpposite, traceSideways], layout);
    console.log("Graph plotted successfully.");

    // Show Step 3 input container for adding phrases
    document.getElementById("userInputContainer").style.display = "block";

  } catch (error) {
    console.error("Error processing data or generating graph:", error);
  }
}

// Function to add user-inputted phrase to the graph
let userPhraseAdded = false; // Track if "User Phrase" legend entry was added
async function addUserPhrase() {
  const userPhrase = document.getElementById("userPhrase").value;
  if (!userPhrase) {
    alert("Please enter a phrase.");
    return;
  }

  try {
        // Run Python code with Pyodide to find nearest neighbor in high-dimensional TF-IDF space
        await pyodide.runPythonAsync(`
          import numpy as np
          from sklearn.neighbors import NearestNeighbors
    
          # Vectorize the new input
          new_tfidf = tfidf_vectorizer.transform(["${userPhrase}"]).toarray()
    
          # Fit NearestNeighbors model on original TF-IDF space
          nn_model = NearestNeighbors(n_neighbors=1).fit(X_tfidf.toarray())
          _, indices = nn_model.kneighbors(new_tfidf)
    
          # Get the t-SNE coordinates of the nearest neighbor and add a slight offset
          nearest_idx = indices[0][0]
          base_x, base_y = tsne_embeddings[nearest_idx]
    
          # Apply a slight random offset to prevent overlapping
          offset = np.random.normal(0, 0.2, 2)  # Adjust standard deviation as needed
          new_x, new_y = base_x + offset[0], base_y + offset[1]
    
          print("Nearest neighbor index:", nearest_idx)
          print("Original t-SNE coordinates:", base_x, base_y)
          print("Offset t-SNE coordinates:", new_x, new_y)
        `);
    

    // Retrieve the offset coordinates
    const new_x = pyodide.globals.get('new_x');
    const new_y = pyodide.globals.get('new_y');

    console.log("New point coordinates (with jitter):", new_x, new_y);

    // Add the new point to the existing graph
    Plotly.addTraces('output', [{
      x: [new_x],
      y: [new_y],
      mode: 'markers+text',
      type: 'scatter',
      name: 'Your Phrase',
      #text: [userPhrase],
      marker: { color: '#000000', size: 12 }, // Black
      showlegend: !userPhraseAdded, // Only show legend for the first user phrase
      hoverinfo: 'text',  // Show only the text on hover
      hovertemplate: '<b>%{text}</b><extra></extra>' // Control hover popup format
    }]);

    // Set the flag to indicate that "User Phrase" has been added to the legend
    userPhraseAdded = true;

    console.log("New phrase added to the plot with jitter.");

  } catch (error) {
    console.error("Error adding user phrase to graph:", error);
  }
}

