class Move {
    constructor(t, v, i, j, s = []) {
        this.t = t; // Whether the move was made by AI
        this.v = v; // Whether the move is a vertical line
        this.i = i; // x-coordinate of the start (upper left) of the line
        this.j = j; // the same
        this.s = s; // squares that this move causes to fill
    }
}

class Board {
    x; // The number of columns of dots in the board
    y; // The number of rows in the board
    ait; // Whether it is the AI's turn after the last move
    l; // How many moves have been made
    h; // List of whether any and all horizontal lines are filled
    v; // List of whether any and all vertical lines are filled
    r; // Whether the rule of turn extension is in place
    ps; // Player's score (in squares)
    as; // AI's score (in squares)
    last; // Most recent move (should be a move object)
    ks; // Children
    constructor(x, y, t, l, r, ps, as, parent = 0) {
        this.x = x;
        this.y = y;
        this.ait = t; // Whether it is the AI's turn
        this.l = l; // How many moves have been made
        if (parent == 0) {
            this.h = new Array( (x - 1) * y ).fill(false);
            this.v = new Array( (y - 1) * x ).fill(false);
        }
        else {
            this.h = structuredClone(parent.h);
            this.v = structuredClone(parent.v);
        }
        this.r = r; // whether the rule of turn extension is in place
        this.ps = ps;
        this.as = as;
        this.ks = []; // Its child boards
    }

    vert(i, j, set=false) {
        if (set) this.v[i + this.x * j] = true;
        return this.v[i + this.x * j];
    }

    horiz(i, j, set=false) {
        if (set) this.h[i * this.y + j] = true;
        return this.h[i * this.y + j];
    }

    make_move(i, j, vert) { // This method makes the given move, assigning to the board's last property,
        this.last = new Move(this.ait, vert, i, j);
        this.l++;
        if (vert) {
            this.vert(i, j, true); // updating the vert or horiz as given
            if (i > 0 && this.vert(i - 1, j) && this.horiz(i - 1, j) && this.horiz(i - 1, j + 1)) {
                this.last.s.push([i - 1, j]); // noting any filled squares
            }
            if (i < this.x && this.vert(i + 1, j) && this.horiz(i, j) && this.horiz(i, j + 1)) {
                this.last.s.push([i, j]);
            }
        }
        else {
            this.horiz(i, j, true);
            if (j < this.y && this.vert(i, j) && this.vert(i + 1, j) && this.horiz(i, j + 1)) {
                this.last.s.push([i, j]);
            }
            if (j > 0 && this.vert(i, j - 1) && this.vert(i + 1, j - 1) && this.horiz(i, j - 1)) {
                this.last.s.push([i, j - 1]);
            }
        }
        if (this.last.s.length > 0) {
            if (this.ait) this.as += this.last.s.length; // updating the score accordingly
            else this.ps += this.last.s.length;
        }
        if (!(this.last.s.length && this.r)) {
            this.ait = !this.ait; // and changing the turn
        }
    }

    get_kids() { // Generate children to the list, child-boards for all possible moves
        let i, j = 0;
        this.h.forEach((element, index) => { // Consider all horizontals
            if (!element) { // where a line is not drawn
                j = index % this.y;
                i = (index - j) / this.y;
                this.ks.push(new Board(this.x, this.y, this.ait, this.l, this.r, this.ps, this.as, this));
                this.ks[this.ks.length - 1].make_move(i, j, false);
            }
        });
        this.v.forEach((element, index) => {
            if (!element) {
                i = index % this.x;
                j = (index - i) / this.x;
                this.ks.push(new Board(this.x, this.y, this.ait, this.l, this.r, this.ps, this.as, this));
                this.ks[this.ks.length - 1].make_move(i, j, true);
            }
        })
    }

    get_simple_score() {
        return this.as - this.ps; // The way score is calculated in a base case
    }

    get_score(n) {
        if (this.l == n) { // If we've looked as far as needed
            return this.get_simple_score();
        }
        else if (this.horiz.every() && this.vert.every()) { // If the board is full
            return this.get_simple_score();
        }
        else {
            if (this.ks.length == 0) this.get_kids(); // If board not full, kids not calculated, calculate them
            let avg = 0;
            this.ks.forEach((element) => { // And return the average of their scores
                avg += element.get_score(n);
            })
            return avg / this.ks.length;
        }
    }
}

class Real_Board extends Board {
    constructor(x, y, t, r, n, ctx, ind) {
        super(x, y, t, 0, (r=="1"), 0, 0);
        this.n = n; // How many levels are looked at, beyond the current, when the AI moves

        this.screen = ctx;
        this.ctx = this.screen.getContext("2d"); // The canvas context on which everything is drawn
        this.ind = ind; // The indicator of whose turn it is
        this.m = 20; // Diameter of dots
        this.s = (this.screen.height - this.y * this.m) / (this.y - 1); // Length of squares
        this.highlight = [0, 0, 0]; // Current thing highlighted
        this.history = []; // Array of moves

        // Constant properties of graphics
        this.ctx.lineWidth = 8;
    }

    // Adjusting the board's properties effectively eliminates any game
    // that may have been played on it.
    adjust(x, y, t, r, n) {
        this.x = x;
        this.y = y;
        this.ait = (t != "0");
        this.r = (r != "0");
        this.n = n;
        this.h = new Array( (x - 1) * y ).fill(false);
        this.v = new Array( (y - 1) * x ).fill(false);
        this.last = false;
        this.s = this.screen.height / this.y - this.m;
        this.screen.width = this.x * (this.m + this.s);

        this.history = [];
        this.ps = 0;
        this.as = 0;
    }

    // Currently called from start_game() in the main html file,
    // this method changes the text of the indicator to "AI's turn",
    // sets its color to blue, and calls it to change back in a bit.
    start_ai_turn() {
        this.ait = true;
        this.ind.innerHTML = "AI's turn";
        this.ind.style.backgroundColor = "blue";
        let that = this;
        setTimeout(function() { that.finish_ai_turn() }, 500);
    }

    // Called from the start_ai_turn() method, this method
    // changes the text of the indicator to "Your turn" and its
    // color back to green.
    finish_ai_turn() {
        this.ait = false;
        this.ind.style.backgroundColor = "green";
        this.ind.innerHTML = "Your turn";
    }

    ///////////////////////////////////////////////////////////////////
    // Drawing methods
    ///////////////////////////////////////////////////////////////////
    get_dot_path() {
        const dot_path = new Path2D();
        for (let i = 0; i <= this.x; ++i) {
            for (let j = 0; j <= this.y; ++j) {
                dot_path.moveTo(this.m + (i + 0.5) * this.s, (j + 0.5) * this.s);
                dot_path.arc( (i + 0.5) * (this.m + this.s), (j + 0.5) * (this.m + this.s), this.m / 2, 0, Math.PI * 2);
            }
        }
        return dot_path;
    }

    // Draws a blank canvas with the current properties
    draw_blank() {
        this.ctx.clearRect(0,0,this.screen.width,this.screen.height);
        this.ctx.fillStyle = "#DDDD00";
        this.ctx.fill(this.get_dot_path());
    }

    // Draws a part of a line and sets the next to be drawn with some delay
    // that - pointer to the canvas
    // x1, y1 - starting point of the line
    // x, y - how far the line goes in each direction
    // p - how much of the line as been drawn
    // d - delay until next segment drawn
    draw_part_line(that, x1, y1, x, y, p, d) {
        if (p < 1) {
            that.ctx.beginPath();
            that.ctx.moveTo(x1 + x * p, y1 + y * p);
            p += 1/12;
            that.ctx.lineTo(x1 + x * p, y1 + y * p);
            that.ctx.stroke();
            window.setTimeout( that.draw_part_line, d, that, x1, y1, x, y, p, d);
        }
    }

    // Draws a line on the board - for highlighting, moving, and erasing
    // i, j - which node starts the line; vert is whether it's vertical
    // high - whether to highlight the line
    // erase - whether to erase the line
    draw_line(i, j, vert, high=false, erase=false) {
        // Choose color
        this.ctx.strokeStyle = high? (this.ait? "rgba(0,0,255,128)" : "rgba(0,255,0,128") : (this.ait ? "blue" : "green");
        // Locate the line's pixels
        let x1 = (i + 0.5) * (this.s + this.m) + !vert * (this.m / 2);
        let y1 = (j + 0.5) * (this.s + this.m) + vert * (this.m / 2);
        let x = !vert * this.s;
        let y = vert * this.s;
        if (!high && !erase) { // If drawing the animation, do that
            this.draw_part_line(this, x1, y1, x, y, 0, 30);
        }
        else if (!erase) { // If not erasing, draw normally
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x1 + x, y1 + y);
            this.ctx.stroke();
        }
        else { // If erasing, erase
            this.ctx.clearRect(x1 - vert*this.m, y1 - !vert*this.m, x + vert * 2 * this.m, y + !vert * 2 * this.m);
        }
    }

    // Highlights or un-highlights node at i, j
    draw_node(i, j, high=false) {
        this.ctx.fillStyle = high? "white" : "yellow";
        this.ctx.beginPath()
        this.ctx.moveTo(this.m + (i + 0.5) * this.s, (j + 0.5) * this.s);
        this.ctx.arc( (i + 0.5) * (this.m + this.s), (j + 0.5) * (this.m + this.s), this.m / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Draws or erases square with upper-left at node i, j
    // Color determined according to the 'ai' argument, and not from 
    // this.ait, because square location is determined from make_move(),
    // which also switches turns at the end, but does not call drawing
    // methods because it applies to the real board and to the abstract
    draw_square(i, j, ai=false, erase=false) {
        if (erase) {
            this.ctx.clearRect((i + 0.5)*this.s + (i + 1)*this.m, (j + 0.5)*this.s + (j + 1)*this.m, this.s, this.s);
        }
        else {
            this.ctx.fillStyle = ai ? "blue" : "green";
            this.ctx.fillRect((i + 0.5)*this.s + (i + 1)*this.m, (j + 0.5)*this.s + (j + 1)*this.m, this.s, this.s);
        }
    }

    // Erases whatever is currently highlighted
    erase_highlighted() {
        if (this.highlight[2] == 2) {
            this.draw_node(this.highlight[0], this.highlight[1]);
        }
        else if (this.highlight[2] != -1) {
            this.draw_line(this.highlight[0], this.highlight[1], this.highlight[2], false, true);
        }
    }

    ///////////////////////////////////////////////////////////////
    // Gameplay methods

    // Given an offset from the canvas, this function returns an array-let [i, j, thing],
    // indicating whatever the cursor at that offset is over.  thing = 2 for node, 1 for vertical line,
    // 0 for horizontal.  i and j are coordinates as above
    locate_cursor(x, y) {
        x -= this.s / 2; // Disregard s/2 margin in corner
        y -= this.s / 2; 
        let i = Math.floor(x / (this.m + this.s)); // Find in which square cursor falls
        let j = Math.floor(y / (this.m + this.s));
        let thing = 0;
        x %= (this.m + this.s); // Focus on relative position in given square
        y %= (this.m + this.s);
        if (x < this.m && y < this.m) { // Could be in node in upper left, otherwise:
            thing = 2;
        }
        else {
            if (x + y > this.s + this.m) { // If in lower right half,
                if (x > y) { // Find whether it's the vertical on the right,
                    i++;
                    thing = 1;
                }
                else { // or the horizontal at the bottom
                    j++;
                    thing = 0;
                }
            }
            else thing = 1 * (y > x); // Otherwise, it's one of the two that starts from the i, j node
        }
        if ( thing != 2) {
            if (i > this.x - 2 + thing) i = this.x - 2 + thing;
            if (j > this.y - 1 - thing) j = this.y - 1 - thing;
            if (i < 0) i = 0;
            if (j < 0) j = 0;
        }
        return [i, j, thing];
    }

    // Handles the highlighting when the cursor hovers over the board
    handle_hover(e) {
        // When the cursor covers over the board, only react if not AI's turn
        if (!this.ait) {
            var i, j, t;
            [i, j, t] = this.locate_cursor(e.offsetX, e.offsetY);
            if (i != this.highlight[0] || j != this.highlight[1] || t != this.highlight[2] ) // If hovering over something besides the current highlight,
            {
                this.erase_highlighted(); // stop highlighting that thing, and if the new thing is highlightable,
                if (t == 2) {
                    this.highlight = [i, j, t]; // highlight the new thing
                    this.draw_node(i, j, true); // whether that be a node,
                }
                else if (t == 0 && !this.horiz(i, j)) { // a horizontal line,
                    this.highlight = [i, j, t]; // highlight the new thing
                    this.draw_line(i, j, false, true);
                }
                else if (t == 1 && !this.vert(i, j)) { // or a vertical line.
                    this.highlight = [i, j, t]; // highlight the new thing
                    this.draw_line(i, j, true, true);
                }
            }
        }
    }

    // Conducts a player's move
    player_move(i, j, vert) {
        this.highlight[2] = -1; // Nothing is highlighted, so nothing to erase
        if (this.ks.length == 0) this.get_kids();
        this.draw_line(i, j, vert);
        this.make_move(i, j, vert); // Make move establishes the last move property,
        this.history.push(this.last); // to be pushed to the history,
        let sameboard = this.ks.find( (element) => { // and compared with the kids, to move down in the move tree
            return (element.last.i == i && element.last.j == j && element.last.v == vert)
        });
        this.last.s.forEach( (element) => {
            this.draw_square(element[0], element[1], false, false);
        })
        this.ks = sameboard.ks;
        if (this.ait) this.start_ai_turn();
        console.log(`Player: ${this.ps}\tAI: ${this.as}`);
    }

    handle_click(e) {
        if (!this.ait) { // If it isn't the AI's turn, it's the players, and moves are highlighted
            var i, j, t;
            [i, j, t] = this.locate_cursor(e.offsetX, e.offsetY);
            if (i == this.highlight[0] && j == this.highlight[1] && t == this.highlight[2] ) { // If player's cursor is on a highlighted thing, it's a valid move.
                if (this.highlight[2] < 2) {
                    this.player_move(this.highlight[0], this.highlight[1], this.highlight[2])
                }
                else {
                    // Player has clicked on a node instead of a line.
                }
            }
        }
    }

    move_back() {
        console.log("Undoing move.");
    }
}