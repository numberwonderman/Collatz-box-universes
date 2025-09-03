class IncrementalTree:
    def __init__(self, root):
        self.root = root
        self.parent = {root: None}
        self.children = {root: []}

        self.Q1 = [root]
        self.Q2 = [root]

        self.q1Index = {root: 0}
        self.q2Index = {root: 0}
        self.q2End = {root: 1}

    def _q1Index(self, node):
        return self.q1Index[node]

    def _q2Index(self, node):
        return self.q2Index[node]

    def _ensureNode(self, node):
        if node not in self.children:
            self.children[node] = []

    def insertChild(self, parent, child):
        if child in self.parent:
            raise ValueError("Child already exists")
        if parent not in self.parent:
            raise ValueError("Parent must exist")

        self.parent[child] = parent
        self._ensureNode(parent)
        self._ensureNode(child)
        siblings = self.children[parent]
        siblings.append(child)

        # Find the correct insertion point in Q1 (preorder traversal).
        if len(siblings) > 1:
            lastSibling = siblings[-2]
            q1InsertIndex = self.q1Index[lastSibling] + 1
        else:
            q1InsertIndex = self.q1Index[parent] + 1

        # Find the correct insertion point in Q2 (postorder traversal).
        if len(siblings) > 1:
            lastSibling = siblings[-2]
            q2InsertIndex = self.q2End[lastSibling]
        else:
            q2InsertIndex = self.q2Index[parent] + 1

        # Splice into Q1 and Q2.
        self.Q1.insert(q1InsertIndex, child)
        self.Q2.insert(q2InsertIndex, child)

        # Update all indices that were shifted.
        for i in range(q1InsertIndex, len(self.Q1)):
            self.q1Index[self.Q1[i]] = i
        for i in range(q2InsertIndex, len(self.Q2)):
            self.q2Index[self.Q2[i]] = i

        # Set the q2End for the new child itself.
        self.q2End[child] = self.q2Index[child] + 1

        # Update q2End values for all ancestors based on the post-order traversal property.
        currentAncestor = parent
        while currentAncestor is not None:
            lastChild = self.children[currentAncestor][-1]
            self.q2End[currentAncestor] = self.q2End[lastChild]
            currentAncestor = self.parent[currentAncestor]

    def reaches(self, u, v):
        pos1u = self._q1Index(u)
        pos1v = self._q1Index(v)
        pos2u = self._q2Index(u)
        pos2v = self._q2Index(v)
        uEnd = self.q2End[u]
        return pos1u < pos1v and pos2v >= pos2u and pos2v < uEnd

    def subtreeMembersQ2(self, u):
        start = self._q2Index(u)
        end = self.q2End[u]
        return self.Q2[start:end]

# Example Usage and Basic Test
if __name__ == "__main__":
    T = IncrementalTree(1)
    T.insertChild(1, 2)
    T.insertChild(1, 3)
    T.insertChild(2, 4)

    assert T.reaches(1, 4)
    assert T.reaches(2, 4)
    assert not T.reaches(3, 4)

    print("IncrementalTree class loaded and basic tests passed.")
