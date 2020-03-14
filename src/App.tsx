import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

import originData from './data/data';
import { IDataset } from './interface'
import './App.css';


function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 20, right: 30, bottom: 30, left: 40 };
  const width = 770 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  const parseTime = d3.timeParse('%Y');

  const dataset: IDataset[] = originData.map(x => {
    return {
      ...x,
      year: parseTime(x.year) as Date
    }
  })

  const xScale = d3.scaleTime()
    // .domain([
    //   d3.min(dataset, d => d.year) as Date,
    //   d3.max(dataset, d => d.year) as Date,
    // ])
    .domain(d3.extent(dataset, (d) => d.year) as Date[])
    .range([0, width])

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset, d => d.homerun) as number])
    .range([height, 0])

  type DataType = { year: any, homerun: any }
  const line = d3.line<DataType>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.homerun))

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(dataset.length);

  const yAxis = d3
    .axisLeft(yScale);


  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const svg = d3.select(svgRef.current)
    const handleSvg = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr('transform', `translate(${margin.left},${margin.top})`)

    /* ********** x軸 ********** */
    handleSvg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
    /* ********** x軸 END ********** */

    /* ********** y軸 ********** */
    handleSvg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(0,0)`)
      .call(yAxis)
    /* ********** y軸 END ********** */

    /* ********** 折線 ********** */
    handleSvg.append("path")
      .datum(dataset)
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);
    /* ********** 折線 END ********** */

    /* ********** 透明版 ********** */
    const helper = handleSvg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")

    const dynamicReferenceLine = handleSvg.append("g");
    const tooltip = handleSvg.append("g");
    const highlightCircle = handleSvg.append("g");

    const drawDynamicReferenceLine = (pointX: number) => {
      // 參考線
      dynamicReferenceLine
        .style("display", null)
        .style("pointer-events", "none")
      dynamicReferenceLine.selectAll("line.vertical-line")
        .data([null])
        .join("line")
        .attr("class", "vertical-line")
        .style("stroke", "red")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.5)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("transform", `translate(${pointX},0)`)
    }


    const drawTooltip = (groupElement: d3.Selection<SVGGElement, any, any, any>, value: string[] | null = null) => {
      if (!value) { return groupElement.style("display", "none"); }

      groupElement
        .style("display", null)
        .style("pointer-events", "none");

      // tooltip:文字
      const tooltipText = groupElement.selectAll("text.tooltip-text")
        .data([null])
        .join("text")
        .attr("class", "tooltip-text")
        .style("font-size", "16px")
        .call((text: any) => text
          .selectAll("tspan")
          .data(value)
          .join("tspan")
          .attr("x", 0)
          .attr("y", (d: string, i: number) => `${i * 1.1}em`)
          .style("font-weight", (_: any, i: number) => i ? null : "bold")
          .text((d: string) => d));

      const bbox = (tooltipText.node() as SVGSVGElement).getBBox();
      // tooltip:外框
      groupElement.selectAll("rect.tooltip-rect")
        .data([null])
        .join("rect")
        .attr("class", "tooltip-rect")
        .attr("x", bbox.x)
        .attr("y", bbox.y)
        .attr("width", bbox.width)
        .attr("height", bbox.height)
        .style("fill", "#FCC100")
        // .style("fill-opacity", ".3")
        .style("stroke", "#666")
        .style("stroke-width", "1.5px");

      groupElement.selectAll("text.tooltip-text").remove()
      groupElement.selectAll("text.tooltip-text")
        .data([null])
        .join("text")
        .attr("class", "tooltip-text")
        .style("font-size", "16px")
        .call((text: any) => text
          .selectAll("tspan")
          .data(value)
          .join("tspan")
          .attr("x", 0)
          .attr("y", (d: string, i: number) => `${i * 1.1}em`)
          .style("font-weight", (_: any, i: number) => i ? null : "bold")
          .text((d: string) => d));
    }

    const drawHighlightCircle = (groupElement: d3.Selection<SVGGElement, any, any, any>, value: { x: number, y: number } | null = null) => {
      if (!value) { return groupElement.style("display", "none"); }

      // circle
      groupElement.style("display", null)
        .style("pointer-events", "none")
      groupElement.selectAll("circle.highlight-circle")
        .data([null])
        .join("circle")
        .attr("class", "highlight-circle")
        .style("fill", "#FCC100")
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .attr("r", 6)
        .attr("transform", `translate(${value.x},${value.y})`)
    }

    helper.on("touchmove mousemove", function () {
      // 座標位置
      // d3.mouse(this) could be d3.mouse(d3.event.currentTarget)
      const [pointX, pointY]: [number, number] = d3.mouse(this)
      // 反推目前滑鼠在的時間
      let mouseDate: Date = xScale.invert(pointX);

      const bisectDate = d3.bisector(function (d: IDataset) { return d.year; }).left;
      let index = bisectDate(dataset, mouseDate, 1);
      const a: IDataset = dataset[index - 1]
      const b: IDataset = dataset[index]
      // 最接近哪一筆資料
      const closerData: IDataset = (mouseDate as any) - (a.year as any) > (b.year as any) - (mouseDate as any) ? b : a

      let tooltipX = xScale(closerData.year) + 10
      let maxYear = d3.max(dataset, d => d.year) as Date
      // 換個方向
      if (xScale(maxYear) - pointX < 90) {
        tooltipX = xScale(closerData.year) - 100
      }

      // 靠很近才顯示
      if (Math.abs(xScale(closerData.year) - pointX) <= 5) {
      tooltip
        .attr("transform", `translate(${tooltipX},${yScale(closerData.homerun)})`)
        .call(drawTooltip, [`${d3.timeFormat('%Y')(closerData.year)}`, `全壘打：${closerData.homerun}`])

      highlightCircle
        .call(drawHighlightCircle, { x: xScale(closerData.year), y: yScale(closerData.homerun) })
      } else {
        tooltip.call(drawTooltip, null)
        highlightCircle.call(drawHighlightCircle, null)
      }

      // 畫參考線
      drawDynamicReferenceLine(pointX)
    });

    helper.on("touchend mouseout", () => {
      dynamicReferenceLine.style("display", "none");
      tooltip.style("display", "none");
      highlightCircle.style("display", "none");
    });
    /* ********** 透明版 END ********** */
  }, [dataset, svgRef.current])


  return (
    <div className="app">
      <div>
        <h3>{`svg ${width}* ${height}`}</h3>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

export default App;
