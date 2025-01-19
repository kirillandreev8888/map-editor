import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { cloneDeep } from 'lodash';
import Raphael, { RaphaelElement, RaphaelPaper } from 'raphael';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [NgbModule, NgbTooltipModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  //TODO сделать масштабирование графики при изменении размера полотна
  resize$ = new Subject<WH>();
  currentWH: WH = { width: 0, height: 0 };
  observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.id === 'map-canvas') {
        this.resize$.next({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
  });

  constructor() {}

  subscriptios = new Subscription();

  paper?: RaphaelPaper;

  ngOnInit(): void {
    const mapCanvas = document.getElementById('map-canvas');
    if (mapCanvas) {
      this.observer.observe(mapCanvas);
      let paper = Raphael(mapCanvas, 100, 100);
      this.paper = paper;
      this.subscriptios.add(
        this.resize$.subscribe((res) => {
          paper.setSize(res.width, res.height);
          this.currentWH = res;
        }),
      );
      const polygon = new Polygon(paper);
      const points = cloneDeep(examplePoints);
      polygon.createVerticles(points);
      polygon.drawPolygon();
    }
  }

  ngOnDestroy(): void {
    this.subscriptios.unsubscribe();
    this.observer.disconnect();
  }

  clone() {
    const polygon = new Polygon(this.paper!);
    const randomMarginX = Math.floor(Math.random() * 300);
    const randomMarginY = Math.floor(Math.random() * 300);

    polygon.createVerticles(
      cloneDeep(examplePoints).map((p) => ({
        x: p.x + randomMarginX,
        y: p.y + randomMarginY,
      })),
    );
    const randomColor =
      '#' + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6);
    polygon.color = randomColor;
    polygon.verticles.forEach((p) => p.element?.attr({ fill: polygon.color }));

    polygon.drawPolygon();
  }
}

interface WH {
  width: number;
  height: number;
}

// type RaphaelElementExtended = RaphaelElement & {
//   ox?: number;
//   oy?: number;
//   index?: number;
// };

class Polygon {
  paper: RaphaelPaper;
  element?: RaphaelElement;
  constructor(paper: RaphaelPaper) {
    this.paper = paper;
  }
  verticles: {
    x: number;
    y: number;
    element?: RaphaelElement;
  }[] = [];

  color: string = 'blue';

  drawPolygon() {
    const pathString = this.verticles.map((p) => `${p.x},${p.y}`).join(' ');
    this.element = this.paper
      .path(`M${pathString}Z`)
      .attr({ fill: this.color, opacity: 0.5, stroke: '#000' });
    this.element.toBack();
    (this.element.node as HTMLElement).oncontextmenu = (e) => {
      e.preventDefault();
      const newVertex = { x: e.layerX, y: e.layerY };
      addVertex(this.verticles, newVertex);
      this.updateVerticles();
      this.redrawPolygon();
      return false;
    };

    let wh: WH[] = [];
    this.element.drag(
      (dx: number, dy: number) => {
        this.verticles.forEach((verticle, i) => {
          verticle.x = wh[i].width + dx;
          verticle.y = wh[i].height + dy;
        });
        this.updateVerticles();
        this.redrawPolygon();
      },
      () => {
        wh = this.verticles.map((p) => ({ width: p.x, height: p.y }));
      },
      () => {
        //endDrag
      },
    );
  }

  createVerticles(points: { x: number; y: number }[]) {
    this.verticles = points.map((p) => this.createVerticle(p));
  }

  createVerticle(point: { x: number; y: number }) {
    let verticle: (typeof this.verticles)[number] = { x: point.x, y: point.y };
    const circle = this.paper
      .circle(verticle.x, verticle.y, 5)
      .attr({ fill: this.color, stroke: '#000', cursor: 'pointer' });
    (circle.node as HTMLElement).oncontextmenu = (e) => {
      e.preventDefault();
      circle.remove();
      this.verticles.splice(this.verticles.indexOf(verticle), 1);
      this.updateVerticles();
      this.redrawPolygon();
      return false;
    };
    verticle.element = circle;
    let wh: WH = { width: 0, height: 0 };
    circle.drag(
      (dx: number, dy: number) => {
        verticle.x = wh.width + dx;
        verticle.y = wh.height + dy;
        circle.attr({ cx: verticle.x, cy: verticle.y });
        this.redrawPolygon();
      },
      () => {
        wh = { width: circle.attr('cx')!, height: circle.attr('cy')! };
      },
      () => {
        //endDrag
      },
    );
    return verticle;
  }

  updateVerticles() {
    this.verticles.forEach((verticle, i) => {
      if (!verticle.element)
        this.verticles[i] = this.createVerticle({
          x: verticle.x,
          y: verticle.y,
        });
      verticle.element?.attr({ cx: verticle.x, cy: verticle.y });
    });
  }

  redrawPolygon() {
    // this.element?.remove();
    // this.drawPolygon();
    const pathString = this.verticles.map((p) => `${p.x},${p.y}`).join(' ');
    this.element?.attr('path', `M${pathString}Z`);
  }

  clear() {
    this.element?.remove();
    this.verticles.forEach((p) => p.element?.remove());
  }
}

interface Point {
  x: number;
  y: number;
}

function addVertex(vertices: Point[], newVertex: Point): Point[] {
  if (vertices.length < 2) {
    // Если вершин меньше двух, просто добавляем новую вершину
    vertices.push(newVertex);
    return vertices;
  }

  let minDistance = Infinity;
  let insertIndex = 0;

  // Проходим по всем парам соседних вершин
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length]; // Следующая вершина (с учетом цикличности)

    // Вычисляем расстояние от новой вершины до текущей и следующей
    const distance = pointToSegmentDistance(newVertex, current, next);

    // Если найдено меньшее расстояние, обновляем минимальное расстояние и индекс вставки
    if (distance < minDistance) {
      minDistance = distance;
      insertIndex = (i + 1) % vertices.length; // Вставляем после текущей вершины
    }
  }

  // Вставляем новую вершину в массив
  vertices.splice(insertIndex, 0, newVertex);
  return vertices;
}

// Функция для вычисления расстояния от точки до отрезка
function pointToSegmentDistance(
  point: Point,
  start: Point,
  end: Point,
): number {
  const l2 = (end.x - start.x) ** 2 + (end.y - start.y) ** 2; // Длина отрезка в квадрате
  if (l2 === 0)
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2); // start и end совпадают

  const t =
    ((point.x - start.x) * (end.x - start.x) +
      (point.y - start.y) * (end.y - start.y)) /
    l2;
  const clampedT = Math.max(0, Math.min(1, t)); // Ограничиваем t от 0 до 1

  const closestPoint = {
    x: start.x + clampedT * (end.x - start.x),
    y: start.y + clampedT * (end.y - start.y),
  };

  return Math.sqrt(
    (point.x - closestPoint.x) ** 2 + (point.y - closestPoint.y) ** 2,
  );
}

const examplePoints = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 300, y: 200 },
  { x: 100, y: 200 },
];
