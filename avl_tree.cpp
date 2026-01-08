struct Node {
    Node * left;
    Node * right;
    int value;
    int diff;
    int count;
    int index; // sum of counts in left subtree
};

void print_node(Node * node) {
    if (node == NULL) cout << "NULL\n";
    else {
        cout << "[" << node->value << " (" << node->count << "x) @" << node->index << "]; diff: " << node->diff << endl;
        cout << "Left: "; print_node(node->left);
        cout << "Right: "; print_node(node->right);
    }
}

Node * new_node(int val) {
    Node * r = new Node;
    r->left = NULL; r->right = NULL;
    r->value = val; r->diff = 0;
    r->count = 1; r->index = 0;
    return r;
}

Node * insert(Node * node, int val) {
    if (node == NULL) return new_node(val);

    if (val == node->value) {
        node->count++;
    }
    else if (val > node->value) {
        if (node->right) {
            node->right = insert(node->right, val);
            if (node->right->diff) node->diff++;
            if (node->diff > 1) {
                // rebalance!!
                if (node->right->diff == 1) { //left-left
                    Node * swap = node->right;
                    swap->index += (node->index + node->count);
                    node->diff = 0;
                    swap->diff = 0;
                    node->right = node->right->left;
                    swap->left = node;
                    return swap;
                }
                else {
                    Node * swap = node->right->left;
                    node->right->index -= (swap->index + swap->count);
                    swap->index += (node->index + node->count);
                    node->diff = 0;
                    swap->diff = 0;
                    node->right->diff = 0;
                    node->right->left = swap->right;
                    swap->right = node->right;
                    node->right = swap->left;
                    swap->left = node;
                    return swap;
                }
            }
        }
        else {
            node->right = new_node(val);
            node->diff = node->left ? 0 : 1;
        }
    }
    else {
        node->index++;
        if (node->left) {
            node->left = insert(node->left, val);
            if (node->left->diff) node->diff--;
            if (node->diff < -1) {
                // rebalance!!
                if (node->left->diff == -1) { //right-right
                    Node * swap = node->left;
                    node->index -= (swap->index + swap->count);
                    node->diff = 0;
                    swap->diff = 0;
                    node->left = node->left->right;
                    swap->right = node;
                    return swap;
                }
                else {
                    Node * swap = node->left->right;
                    swap->index += (node->left->index + node->left->count);
                    node->index -= (swap->index + swap->count);
                    node->diff = 0;
                    swap->diff = 0;
                    node->left->diff = 0;
                    node->left->right = swap->left;
                    swap->left = node->left;
                    node->left = swap->right;
                    swap->right = node;
                    return swap;
                }
            }
        }
        else {
            node->left = new_node(val);
            node->diff = node->right ? 0 : -1;
        }
    }
    return node;
}

void clean(Node * node) {
    if (node == NULL) return;
    clean(node->left);
    clean(node->right);
    delete node;
}

pair<int, int> bounds(Node * node, int val) {
    if (node == NULL) return make_pair(0, 0);
    if (node->value == val) return make_pair(node->index, node->count);
    else if (node->value > val) return bounds(node->left, val);
    else {
        auto r = bounds(node->right, val);
        r.first += node->index + node->count;
        return r;
    }
}