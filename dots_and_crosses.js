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
    m; // Total possible moves
    h; // List of which horizontal lines are filled
    v; // List of which vertical lines are filled
    r; // Whether the rule of turn extension is in place
    ps; // Player's score (in squares)
    as; // AI's score (in squares)
    last; // Most recent move (should be a move object)
    ks; // Children
    constructor(x, y, t, l, r, ps, as, parent = 0) {
        this.x = x;
        this.y = y;
        this.m = (x - 1) * y + (y - 1) * x;
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
        else if (this.l == this.m) { // If the board is full
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
        this.ind = ind; // The graphic indicating on-screen whose turn it is

        // Constant properties of graphics
        this.ctx.lineWidth = 8;
        this.d = 20; // Diameter of dots
        this.s = (this.screen.height - this.y * this.d) / (this.y - 1); // Length of squares

        this.highlight = [0, 0, 0]; // Current thing highlighted (i, j, and whether horizontal (0) vertical (1) or node (2) )
        this.history = []; // Array of moves

    }

    // Adjusting the board's properties effectively eliminates any game
    // that may have been played on it.
    adjust(x, y, t, r, n) {
        this.x = x;
        this.y = y;
        this.m = (x - 1) * y + (y - 1) * x;
        this.ait = (t != "0");
        this.r = (r != "0");
        this.n = n;
        this.l = 0;
        this.h = new Array( (x - 1) * y ).fill(false);
        this.v = new Array( (y - 1) * x ).fill(false);
        this.last = false;
        this.s = this.screen.height / this.y - this.d;
        this.screen.width = this.x * (this.d + this.s);

        this.history = [];
        this.ps = 0;
        this.as = 0; // HOPEFULLY JavaScript's engine deletes all child
        this.ks = []; // objects here - in C I would worry a lot about memory leak here

        if (this.ait) this.start_ai_turn();
    }

    // AI sets the indicator to blue and chooses its move;
    // then calls the finish_ai_turn() to occur later.
    start_ai_turn() {
        if (this.l == this.m) {
            this.game_over();
        } else {
            this.ind.innerHTML = "AI's turn"; // Update graphics
            this.ind.style.backgroundColor = "blue";

            if (this.ks.length == 0) this.get_kids(); // Choose move
            var best_choice;
            let best_score = -100; // lower than any possible score yet allowed
            var new_score;
            this.ks.forEach( (element) => { 
                new_score = element.get_score(this.n * 1 + this.l); // Multiplying by one is necessary to force JS to recognize this.n as an integer, otherwise it would concatenate here, produce a big number, and run forever.
                if (new_score > best_score) {
                    best_score = new_score;
                    best_choice = element;
                }
            } )

            this.make_move(best_choice.last.i, best_choice.last.j, best_choice.last.v);
            this.history.push(this.last); // make_move may have changed this.ait back
            this.ks = best_choice.ks;

            this.draw_line(this.last.i, this.last.j, this.last.v, false, false, true);
            this.last.s.forEach( (element) => {
                this.draw_square(element[0], element[1], true, false);
            })
        
            let that = this; // Return graphics to normal later
            setTimeout(function() { that.finish_ai_turn(this.ait) }, 1000);
            if (!this.ait) this.ait = true; // if this.ait has changed back, take control back so player cannot highlight until line is drawn
        }

    }

    // Called from the start_ai_turn() method, this method
    // changes the text of the indicator to "Your turn" and its
    // color back to green.
    finish_ai_turn(keep_control) {
        if (this.m == this.l) {
            this.game_over();
        }
        else if (keep_control) { // Would have been changed by make_move in start_ai_turn()
            this.start_ai_turn();
        }
        else {
            this.ind.style.backgroundColor = "green";
            this.ind.innerHTML = "Your turn";
            this.ait = false;
        }
    }

    ///////////////////////////////////////////////////////////////////
    // Drawing methods
    ///////////////////////////////////////////////////////////////////
    get_dot_path() {
        const dot_path = new Path2D();
        for (let i = 0; i <= this.x; ++i) {
            for (let j = 0; j <= this.y; ++j) {
                dot_path.moveTo(this.d + (i + 0.5) * this.s, (j + 0.5) * this.s);
                dot_path.arc( (i + 0.5) * (this.d + this.s), (j + 0.5) * (this.d + this.s), this.d / 2, 0, Math.PI * 2);
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
    draw_line(i, j, vert, high=false, erase=false, ai=false) {
        // Choose color
        this.ctx.strokeStyle = high? ("rgba(0,255,0,128") : ( ai ? "blue" : "green");
        // Locate the line's pixels
        let x1 = (i + 0.5) * (this.s + this.d ) + !vert * (this.d / 2);
        let y1 = (j + 0.5) * (this.s + this.d ) + vert * (this.d / 2);
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
            this.ctx.clearRect(x1 - vert*this.d , y1 - !vert*this.d , x + vert * 2 * this.d , y + !vert * 2 * this.d );
        }
    }

    // Highlights or un-highlights node at i, j
    draw_node(i, j, high=false) {
        this.ctx.fillStyle = high? "white" : "yellow";
        this.ctx.beginPath()
        this.ctx.moveTo(this.d + (i + 0.5) * this.s, (j + 0.5) * this.s);
        this.ctx.arc( (i + 0.5) * (this.d + this.s), (j + 0.5) * (this.d + this.s), this.d / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Draws or erases square with upper-left at node i, j
    // Color determined according to the 'ai' argument, and not from 
    // this.ait, because square location is determined from make_move(),
    // which also switches turns at the end, but does not call drawing
    // methods because it applies to the real board and to the abstract
    draw_square(i, j, ai=false, erase=false) {
        if (erase) {
            this.ctx.clearRect((i + 0.5)*this.s + (i + 1)*this.d , (j + 0.5)*this.s + (j + 1)*this.d , this.s, this.s);
        }
        else {
            this.ctx.fillStyle = ai ? "blue" : "green";
            this.ctx.fillRect((i + 0.5)*this.s + (i + 1)*this.d , (j + 0.5)*this.s + (j + 1)*this.d , this.s, this.s);
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
        let i = Math.floor(x / (this.d + this.s)); // Find in which square cursor falls
        let j = Math.floor(y / (this.d + this.s));
        let thing = 0;
        x %= (this.d + this.s); // Focus on relative position in given square
        y %= (this.d + this.s);
        if (x < this.d && y < this.d ) { // Could be in node in upper left, otherwise:
            thing = 2;
        }
        else {
            if (x + y > this.s + this.d ) { // If in lower right half,
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
        if (this.ait) { // Officially conduct the AI's turn once the line is drawn
            let that = this;
            window.setTimeout( function() { that.start_ai_turn(); }, 1000);
        }
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

    game_over() {
        let that = this;
        window.alert(`Game over!\n\nAI score: ${that.as}\nPlayer score: ${that.ps}`);
    }
}
