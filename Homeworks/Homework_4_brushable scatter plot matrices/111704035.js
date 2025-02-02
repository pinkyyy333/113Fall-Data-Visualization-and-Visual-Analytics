// 載入 iris.csv 資料並呼叫 render 函數處理
d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv").then((data) => {
    render(data);
});

// 設定畫布的寬度和高度
const width = 960;
const height = 960;
// 設定 padding
const padding = 28;
// 設定要繪製的四個 columns
const columns = ["sepal length", "sepal width", "petal length", "petal width"];
// 計算每個 cell 的大小
const size =
    (width - (columns.length + 1) * padding) / columns.length + padding;

// 設定顏色映射，每種 iris 花有不同的顏色
const colorMap = {
    "Iris-setosa": "#FFACBB",
    "Iris-versicolor": "#FFCC66",
    "Iris-virginica": "#66CCCC",
};

// 選擇 SVG 畫布
const svg = d3.select("svg");

// 定義 brush 函數，用來處理選取區域的交互行為
const brush = (cell, circle, svg, { padding, size, x, y, columns }) => {
    // 定義 brush 行為，包括起始、brush 中及結束的處理
    const brush = d3
        .brush()
        .extent([
            [padding / 2, padding / 2], // brush 的範圍
            [size - padding / 2, size - padding / 2],
        ])
        .on("start", brushstarted)
        .on("brush", brushed)
        .on("end", brushended);

    // 在 cell 上呼叫 brush
    cell.call(brush);

    // 用來保存當前 brush 的 cell
    let brushCell;

    // 當 brush 開始時，若有其他區域已 brush，則清除
    function brushstarted() {
        if (brushCell !== this) {
            d3.select(brushCell).call(brush.move, null);
            brushCell = this;
        }
    }

    // 當 brush 進行中，highlight 被選中的點
    function brushed({ selection }, [i, j]) {
        let selected = [];
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            circle.classed(
                "hidden",
                (d) =>
                    x0 > x[i](d[columns[i]]) || // x0 篩選條件
                    x1 < x[i](d[columns[i]]) || // x1 篩選條件
                    y0 > y[j](d[columns[j]]) || // y0 篩選條件
                    y1 < y[j](d[columns[j]])    // y1 篩選條件
            );
            // 選取的資料篩選出來
            selected = data.filter(
                (d) =>
                    x0 < x[i](d[columns[i]]) &&
                    x1 > x[i](d[columns[i]]) &&
                    y0 < y[j](d[columns[j]]) &&
                    y1 > y[j](d[columns[j]])
            );
        }
        // 將選取的資料 dispatch 到 svg 物件上
        svg.property("value", selected).dispatch("input");
    }

    // 當 brush 結束且無選取區域時，重置並顯示所有點
    function brushended({ selection }) {
        if (selection) return;
        svg.property("value", []).dispatch("input");
        circle.classed("hidden", false);
    }
}

// render 函數負責繪製散佈圖矩陣
const render = (data) => {
    // 定義每個屬性的 x 軸
    const x = columns.map((column) =>
        d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d[column])) // 依據資料範圍設置軸 domain
            .rangeRound([padding / 2, size - padding / 2]) // 設置軸範圍
    );

    // 定義每個屬性的 y 軸，為 x 軸的拷貝並反轉範圍
    const y = x.map((x) => x.copy().range([size - padding / 2, padding / 2]));

    // 定義 x 軸的樣式
    const axisx = d3
        .axisBottom()
        .ticks(6)
        .tickSize(size * columns.length); // 設置刻度數量和大小

    // 定義每個 column 的 x 軸繪製方式
    const xAxis = (g) =>
        g
            .selectAll("g")
            .data(x)
            .join("g")
            .attr("transform", (d, i) => `translate(${i * size},0)`) // 設定 x 軸位置
            .each(function (d) {
                return d3.select(this).call(axisx.scale(d)); // 繪製每個 x 軸
            })
            .call((g) => g.select(".domain").remove()) // 移除軸線
            .call((g) => g.selectAll(".tick line").attr("stroke", "#ddd")); // 設定刻度線樣式

    // 定義 y 軸的樣式
    const axisy = d3
        .axisLeft()
        .ticks(6)
        .tickSize(-size * columns.length); // 設置刻度數量和大小

    // 定義每個 row 的 y 軸繪製方式
    const yAxis = (g) =>
        g
            .selectAll("g")
            .data(y)
            .join("g")
            .attr("transform", (d, i) => `translate(0,${i * size})`) // 設定 y 軸位置
            .each(function (d) {
                return d3.select(this).call(axisy.scale(d)); // 繪製每個 y 軸
            })
            .call((g) => g.select(".domain").remove()) // 移除軸線
            .call((g) => g.selectAll(".tick line").attr("stroke", "#ddd")); // 設定刻度線樣式

    // 設置 svg 畫布尺寸並新增樣式
    svg.attr("viewBox", [-padding, 0, width, height])
        .append("style")
        .text(`circle.hidden { fill: #000; fill-opacity: 1; r: 1px; }`);

    // 繪製 x 軸
    svg.append("g").call(xAxis);

    // 繪製 y 軸
    svg.append("g").call(yAxis);

    // 繪製每個 cell
    const cell = svg
        .append("g")
        .selectAll("cell")
        .data(d3.cross(d3.range(columns.length), d3.range(columns.length))) // 獲取所有可能的 cell 組合
        .join("g")
        .attr("transform", ([i, j]) => `translate(${i * size},${j * size})`); // 根據位置繪製每個 cell
    

    // 為每個 cell 加入矩形框架
    cell.append("rect")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("x", padding / 2 + 0.5)
        .attr("y", padding / 2 + 0.5)
        .attr("width", size - padding)
        .attr("height", size - padding);

    // 處理每個 cell 的繪製
    cell.each(function ([i, j]) {
        if (i == j) {
            // 當 i 與 j 相同時，繪製直方圖
            const values = data.map(function (d) {
                return +d[columns[i]];
            });
            const xHist = d3
                .scaleLinear()
                .domain([d3.min(values), d3.max(values)]) // 設置直方圖的 x 軸範圍
                .range([padding / 2, size - padding / 2]);

            const histogram = d3
                .bin()
                .domain(xHist.domain())
                .thresholds(xHist.ticks(10))(values); // 設置直方圖的資料分箱

            const yHist = d3
                .scaleLinear()
                .domain([
                    0,
                    d3.max(histogram, function (d) {
                        return d.length;
                    }),
                ]) // 設置直方圖的 y 軸範圍
                .range([size - padding / 2, padding / 2]);

            // 繪製直方圖的 bar
            d3.select(this)
                .selectAll("bar")
                .data(histogram)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", function (d) {
                    return xHist(d.x0);
                })
                .attr("y", function (d) {
                    return yHist(d.length);
                })
                .attr(
                    "width",
                    xHist(histogram[0].x1) - xHist(histogram[0].x0) - 1
                )
                .attr("height", (d) => size - padding / 2 - yHist(d.length))
                .style("fill", "#FF9966")
                .style("opacity", 0.7);
        } else {
            // 繪製散點圖
            d3.select(this)
                .selectAll("circle")
                .data(
                    data.filter(
                        (d) => !isNaN(d[columns[i]]) && !isNaN(d[columns[j]])
                    )
                )
                .join("circle")
                .attr("cx", (d) => x[i](d[columns[i]])) // x 座標
                .attr("cy", (d) => y[j](d[columns[j]])); // y 座標
        }

        // 繪製每個 cell 的標籤文字
        svg.append("g" )
            .style("font", "15px Times New Roman")
            .style("pointer-events", "none")
            .selectAll("text")
            .data(columns)
            .join("text")
            .attr("transform", (d, i) => `translate(${i * size},${i * size})`)
            .attr("x", padding)
            .attr("y", padding)
            .text((d) => d);
    });

    // 定義 circle 點的樣式
    const circle = cell
        .selectAll("circle")
        .attr("r", 3.5)
        .attr("fill-opacity", 0.7)
        .attr("fill", (d) => `${colorMap[d["class"]]}`);

    // 加入 brush 功能
    cell.call(brush, circle, svg, { padding, size, x, y, columns });
};
