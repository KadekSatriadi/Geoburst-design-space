class Geoburst {
    constructor(settings){
        this.svg = settings.svg;
        this.globe;
        this.graticule;
        this.geojson = settings.geojson;
    }

    drawGraticule(){
        const graticule = d3.geoGraticule();
        if(this.graticule) this.graticule.remove();
        this.graticule = this.svg.append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("class", "graticule")
        .style("fill", "none")
        .style("stroke", "gray")
        .style("stroke-width", 0.5);
    }

    setRotateable(){
        let svg = this.svg;
        // Add interactivity to rotate the globe on mouse click
        svg.call(d3.drag()
        .on("start", dragStart)
        .on("drag", dragging)
        );

        let rotation = [0, 0];
        let dragStartCoords;
        let t = this;

        function dragStart(event) {
            dragStartCoords = d3.pointer(event);
            //event
            const rotationEvent = new CustomEvent('onGlobeRotateStart', {
                detail: {
                    rotation: rotation,
                    event: event
                }
            });
            document.dispatchEvent(rotationEvent);
        }

        function dragging(event) {
            const currentCoords = d3.pointer(event);
            const dx = currentCoords[0] - dragStartCoords[0];
            const dy = currentCoords[1] - dragStartCoords[1];
            rotation = [rotation[0] + dx, rotation[1] - dy];
            projection.rotate(rotation);
            t.drawGraticule();
            t.globe.attr("d", path);
            dragStartCoords = currentCoords;
            //event
            const rotationEvent = new CustomEvent('onGlobeRotating', {
                detail: {
                    rotation: rotation,
                    event: event
                }
            });
            document.dispatchEvent(rotationEvent);
        }
    }

    drawCountries(){
        let geojson = this.geojson;
        let svg = this.svg;

        this.globe =  svg.selectAll("path")
            .data(geojson.features)
            .enter().append("path")
            .attr("d", path)
            .style("fill", "gray") // You can style the features as you like
            .style("stroke", "white"); // You can style the features as you like    
            
        this.globe.on("mouseenter", (e, d)=>{
            console.log(d.properties);
        })
    }

    draw(){
         this.drawGraticule();
         this.drawCountries();   
         this.setRotateable();
    }
}

class Helper{
    static polarToCartesian(angle, radius) {
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        return { x, y };
    }

    // Function to convert degrees to radians
    static degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Function to convert radians to degrees
    static radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    // Function to convert Cartesian coordinates to polar (radial) coordinates
    static cartesianToPolar(x, y) {
        const radius = Math.sqrt(x * x + y * y);
        const angle = Math.atan2(y, x);
        return { angle, radius };
    }
    
    static isPointVisible(latitude, longitude, projection) {
        const path = d3.geoPath()
                    .projection(projection);
        const visible = path(
            {type: 'Point', coordinates: [longitude, latitude]});
        
          return visible;
    }
}

class LinkVisualizer {
    constructor(settings){
        this.globe = settings.globe;
        this.chart = settings.chart;
        this.projection = settings.projection;
        this.links;
        this.initListenerOnGlobeRotate();
    }

    initListenerOnGlobeRotate(){
        let t = this;
        document.addEventListener('onGlobeRotating', function (event) {
            const customData = event.detail.rotation;
            t.updateLinks();
        });
    }

    updateLinks(){
        let projection = this.projection;
        this.links
        .attr("x2", (d)=> {
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);           
            return projection([lat, lon])[0];
        })
        .attr("y2", (d)=> {
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);  
            return projection([lat, lon])[1];
        })
        .style("stroke-width", (d) =>{
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);  
            if(Helper.isPointVisible(lat, lon, projection)){
                return 2;
            }else{
                return 0;
            }
        })
    }

    drawLinks(){
        let data = this.chart.data;
        let centerx = this.chart.centerx;
        let centery = this.chart.centery;
        let barWidthAngle = Helper.degreesToRadians(360/data.length);
        let radius = this.chart.radius;
        let projection = this.projection;

        this.links = svg.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", (d, i) => {
            let barPostAngle = i * barWidthAngle;
            return Helper.polarToCartesian(barPostAngle, radius).x + centerx;                
        })
        .attr("y1", (d, i) => {
            let barPostAngle = i * barWidthAngle;
            return Helper.polarToCartesian(barPostAngle, radius).y + centery;                
        })
        .attr("x2", (d)=> {
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);           
            return projection([lat, lon])[0];
        })
        .attr("y2", (d)=> {
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);  
            return projection([lat, lon])[1];
        })
        .attr("stroke", "steelblue")
        .attr("stroke-dasharray", "4 2")
        .style("stroke-width", (d) =>{
            let lat = parseFloat(d[this.chart.mapping.latitude]);
            let lon = parseFloat(d[this.chart.mapping.longitude]);  
            if(Helper.isPointVisible(lat, lon, projection)){
                return 1;
            }else{
                return 0;
            }
        })
  }
}

class RadialSymbolChart {
    constructor(setting){
        this.radius = setting.radius;
        this.svg = setting.svg;
        this.centerx = setting.centerx;
        this.centery = setting.centery;
        this.radiusScale = setting.radiusScale;
        this.data = setting.data;
        this.mapping = setting.mapping;
        this.symbols;
    }

    draw(){
        let radiusScale = this.radiusScale; 
        let radius = this.radius;
        let svg = this.svg;
        let data = this.data;
        let centerx = this.centerx;
        let centery = this.centery;

        let barWidthAngle = Helper.degreesToRadians(360/data.length);
        this.symbols = svg.selectAll("rect")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => {
            let barPostAngle = i * barWidthAngle;
            return Helper.polarToCartesian(barPostAngle, radius).x + centerx;                
        })
        .attr("cy", (d, i) => {
            //height - yScale(d)
            let barPostAngle = i * barWidthAngle;
            return Helper.polarToCartesian(barPostAngle, radius).y + centery;  
        })
        .attr("r", (d) => {
            return Math.pow(radiusScale(d[this.mapping.radius]), 0.5);
        })
        .style("fill", "steelblue");

        this.symbols.on("mouseenter", (e, d)=>{
            console.log(d);
        })
    }
}