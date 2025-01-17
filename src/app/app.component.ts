import { Component, OnDestroy, OnInit } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import Raphael from 'raphael';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  // imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  resize$ = new Subject<WH>();
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
      }))
      const rect = paper.set();
      // Creates circle at x = 50, y = 40, with radius 10
      var circle = paper.circle(50, 40, 10);
      // Sets the fill attribute of the circle to red (#f00)
      circle.attr('fill', '#f00');
      // Sets the stroke attribute of the circle to white
      circle.attr('stroke', '#fff');
    }
    // setInterval(()=>{
    // }, 1000)
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
