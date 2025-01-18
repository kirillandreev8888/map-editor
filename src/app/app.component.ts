import { Component, OnDestroy, OnInit } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import Raphael, { RaphaelElement } from 'raphael';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  // imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
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

  ngOnInit(): void {
    const mapCanvas = document.getElementById('map-canvas');
    if (mapCanvas) {
      this.observer.observe(mapCanvas);
      let paper = Raphael(mapCanvas, 100, 100);
      this.subscriptios.add(
        this.resize$.subscribe((res) => {
          paper.setSize(res.width, res.height);
          this.currentWH = res;
        }),
      );
      // Определяем координаты вершин многоугольника
      var points = [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 200 },
        { x: 100, y: 200 },
      ];

      // Функция для отрисовки многоугольника
      function drawPolygon() {
        var pathString = points.map((p) => `${p.x},${p.y}`).join(' ');
        return paper
          .path(`M${pathString}Z`)
          .attr({ fill: '#00f', opacity: 0.5, stroke: '#000' });
      }

      // Функция для создания вершин
      function createVertices() {
        points.forEach((point, index) => {
          var circle = paper
            .circle(point.x, point.y, 5)
            .attr({ fill: '#00f', stroke: '#000' });
          circle.data('index', index);
          circle.drag(moveVertex, startDrag, endDrag);
        });
      }

      // Функция для начала перетаскивания
      function startDrag(this: RaphaelElementExtended, x: number, y: number) {
        this.ox = this.attr('cx');
        this.oy = this.attr('cy');
      }

      // Функция для перемещения вершины
      function moveVertex(this: RaphaelElementExtended, dx: number, dy: number) {
        console.log(dx, dy);

        var newX = (this.ox??0) + dx;
        var newY = (this.oy??0) + dy;
        this.attr({ cx: newX, cy: newY });
        points[this.data('index')??0].x = newX;
        points[this.data('index')??0].y = newY;
        redrawPolygon();
      }

      // Функция для завершения перетаскивания
      function endDrag() {
        // Здесь можно добавить логику, если нужно
      }

      // Функция для перерисовки многоугольника
      function redrawPolygon() {
        paper.clear();
        drawPolygon();
        createVertices();
      }

      // Инициализация
      drawPolygon();
      createVertices();
    }
  }

  ngOnDestroy(): void {
    this.subscriptios.unsubscribe();
    this.observer.disconnect();
  }
}

interface WH {
  width: number;
  height: number;
}

type RaphaelElementExtended = RaphaelElement & {
  ox?: number;
  oy?: number;
  index?: number;
};
