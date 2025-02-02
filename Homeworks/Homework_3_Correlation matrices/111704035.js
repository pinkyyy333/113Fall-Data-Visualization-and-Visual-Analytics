// Graph dimension settings
const margin = { top: 20, right: 20, bottom: 20, left: 50 },
    width = 700 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

// Load the data from the abalone.data file
d3.text("http://vis.lab.djosix.com:2024/data/abalone.data").then(function (data) {

    // List of features (columns) for correlation calculation
    var features = ["Length", "Diameter", "Height", "Whole_weight", "Shucked_weight", "Viscera_weight", "Shell_weight", "Rings"];

    // Empty arrays for storing male (M), female (F), and infant (I) data
    var data_M = [];
    var data_F = [];
    var data_I = [];

    // Split the data into rows based on newline character
    var rows = data.split("\n");
    
    // Process each row
    for (var i = 0; i < rows.length; i++) {
        var cols = rows[i].split(",");

        // Create a list of numeric values starting from the second column
        var list = [];
        for (var j = 0; j < 8; j++) {
            list.push(+cols[j + 1]);
        }

        // Categorize data by the first column (sex: M, F, or I)
        if (cols[0] == "M") {
            data_M.push(list);
        }
        if (cols[0] == "F") {
            data_F.push(list);
        }
        if (cols[0] == "I") {
            data_I.push(list);
        }
    }

    // Calculate correlation matrices for each group (M, F, I)
    cm_M = correlation_matrix(data_M);
    cm_F = correlation_matrix(data_F);
    cm_I = correlation_matrix(data_I);

    // Render the legend (color scale)
    render_legend();

    // Initial render of the correlation matrix for males (default)
    render_cm(cm_M);

    // Add an event listener to the radio buttons to change the matrix based on the selection
    const radioButtons = document.querySelectorAll('input[name="sex"]');
    for (const radioButton of radioButtons) {
        radioButton.addEventListener('change', showSelected);
    }

    // This function is triggered when a radio button is selected
    function showSelected(e) {
        if (this.checked) {
            if (this.value == "male") {
                render_cm(cm_M); // Render male correlation matrix
            }
            if (this.value == "female") {
                render_cm(cm_F); // Render female correlation matrix
            }
            if (this.value == "infant") {
                render_cm(cm_I); // Render infant correlation matrix
            }
        }
    }

    // Function to calculate the correlation matrix
    function correlation_matrix(data) {
        // Transpose the data to prepare for correlation calculation
        const matrix = math.transpose(data);
        let cm = [];

        // Calculate pairwise correlations
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix.length; j++) {
                let corr = math.corr(matrix[i], matrix[j]); // Calculate correlation
                cm.push({
                    x: features[i],
                    y: features[j],
                    value: +corr
                });
            }
        }
        return cm; // Return the correlation matrix
    }

    // Function to render the legend (color scale for correlations)
    function render_legend() {
        var legend_top = 15;
        var legend_height = 15;

        var legend_svg = d3.selectAll(".legend").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", legend_height + legend_top + 20)
            .append("g")
            .attr("transform", "translate(" + margin.left + ", " + legend_top + ")");

        var defs = legend_svg.append("defs");

        // Create a linear gradient for the color scale (correlation range from -1 to 1)
        var gradient = defs.append("linearGradient")
            .attr("id", "linear-gradient");

        var stops = [
            { offset: 0, color: "#B22222", value: -1 },
            { offset: .5, color: "#ffffff", value: 0 },
            { offset: 1, color: "#000080", value: 1 }
        ];

        // Append the gradient stops
        gradient.selectAll("stop")
            .data(stops)
            .enter().append("stop")
            .attr("offset", function (d) { return (100 * d.offset) + "%"; })
            .attr("stop-color", function (d) { return d.color; });

        // Create a rectangle with the gradient fill
        legend_svg.append("rect")
            .attr("width", width)
            .attr("height", legend_height)
            .style("fill", "url(#linear-gradient)");

        // Add text labels for the color scale values (-1, 0, 1)
        legend_svg.selectAll("text")
            .data(stops)
            .enter().append("text")
            .attr("x", function (d) { return width * d.offset; })
            .attr("dy", -3)
            .style("text-anchor", function (d, i) {
                return i == 0 ? "start" : i == 1 ? "middle" : "end";
            })
            .text(function (d) { return d.value.toFixed(2); })
            .style("font-size", 12);
    }

    // Function to render the correlation matrix
    function render_cm(cm) {
        // Clean previous svg elements
        d3.select("#cm").select('svg').remove();

        // Extract unique variable names and determine the number of variables
        const domain = Array.from(new Set(cm.map(function (d) { return d.x; })));
        const num = Math.sqrt(cm.length);

        // Create a color scale for correlation values
        const color = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(["#B22222", "#ffffff", "#000080"]);

        // Create a size scale for circles (used in the upper-right part)
        const size = d3.scaleSqrt()
            .domain([0, 1])
            .range([0, 12]);

        // X scale for positioning
        const x = d3.scalePoint()
            .range([0, width])
            .domain(domain);

        // Y scale for positioning
        const y = d3.scalePoint()
            .range([0, height])
            .domain(domain);

        // Create the svg area
        const svg = d3.select("#cm")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create one 'g' element for each cell of the correlogram
        const cor = svg.selectAll(".cor")
            .data(cm)
            .join("g")
            .attr("class", "cor")
            .attr("transform", function (d) {
                return `translate(${x(d.x)}, ${y(d.y)})`;
            });

        // Lower-left part + Diagonal: Add text with specific color
        cor.filter(function (d) {
            const ypos = domain.indexOf(d.y);
            const xpos = domain.indexOf(d.x);
            return xpos <= ypos;
        })
            .append("text")
            .attr("y", 5)
            .text(function (d) {
                if (d.x === d.y) {
                    return d.x; // Diagonal: feature names
                } else {
                    return d.value.toFixed(2); // Correlation values
                }
            })
            .style("font-size", 12)
            .attr("text-anchor", "middle")
            .style("fill", function (d) {
                if (d.x === d.y) {
                    return "#000";
                } else {
                    return color(d.value); // Color based on correlation value
                }
            });

        // Upper-right part: Add circles
        cor.filter(function (d) {
            const ypos = domain.indexOf(d.y);
            const xpos = domain.indexOf(d.x);
            return xpos > ypos;
        })
            .append("circle")
            .attr("r", function (d) { return size(Math.abs(d.value)); }) // Circle size based on correlation
            .style("fill", function (d) { return color(d.value); }) // Circle color based on correlation
            .style("opacity", 0.8);
    }
});
