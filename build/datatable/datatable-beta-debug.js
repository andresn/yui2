/**
 * The DataTable widget provides a progressively enhanced DHTML control for
 * displaying tabular data across A-grade browsers.
 *
 * @module datatable
 * @requires yahoo, dom, event, datasource
 * @optional dragdrop
 * @title DataTable Widget
 */

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * DataTable class for the YUI DataTable widget.
 *
 * @class DataTable
 * @uses YAHOO.util.EventProvider
 * @constructor
 * @param elContainer {HTMLElement} Container element for the TABLE.
 * @param oColumnSet {YAHOO.widget.ColumnSet} ColumnSet instance.
 * @param oDataSource {YAHOO.util.DataSource} DataSource instance.
 * @param oConfigs {object} (optional) Object literal of configuration values.
 */
YAHOO.widget.DataTable = function(elContainer,oColumnSet,oDataSource,oConfigs) {
    // Internal vars
    var i;
    this._nIndex = YAHOO.widget.DataTable._nCount;
    this._sName = "instance" + this._nIndex;
    this.id = "yui-dt"+this._nIndex;

    // Validate configs
    if(typeof oConfigs == "object") {
        for(var sConfig in oConfigs) {
            this[sConfig] = oConfigs[sConfig];
        }
    }

    // Validate DataSource
    if(oDataSource) {
        if(oDataSource instanceof YAHOO.util.DataSource) {
            this.dataSource = oDataSource;
        }
        else {
            YAHOO.log("Invalid DataSource", "warn", this.toString());
        }
    }

    // Validate ColumnSet
    if(oColumnSet && (oColumnSet instanceof YAHOO.widget.ColumnSet)) {
        this._oColumnSet = oColumnSet;
    }
    else {
        YAHOO.log("Could not instantiate DataTable due to an invalid ColumnSet", "error", this.toString());
        return;
    }
    
    // Create RecordSet
    this._oRecordSet = new YAHOO.widget.RecordSet();

    // Validate HTML Element
    elContainer = YAHOO.util.Dom.get(elContainer);
    if(elContainer && (elContainer.nodeName.toLowerCase() == "div")) {
        this._elContainer = elContainer;
        // Peek in container child nodes to see if TABLE already exists
        var elTable = null;
        if(elContainer.hasChildNodes()) {
            var children = elContainer.childNodes;
            for(i=0; i<children.length; i++) {
                if(children[i].nodeName.toLowerCase() == "table") {
                    elTable = children[i];
                    break;
                }
            }
        }

        // Progressively enhance an existing table from markup...
        // while using the markup as the source of data
        if(elTable && !this.dataSource) {
            // Fill RecordSet with data parsed out of table
            var aRecords = [];

            // Iterate through each TBODY
            for(i=0; i<elTable.tBodies.length; i++) {
                var elBody = elTable.tBodies[i];

                // Iterate through each TR
                for(var j=0; j<elBody.rows.length; j++) {
                    var elRow = elBody.rows[j];
                    var oRecord = {};

                    // Iterate through each TD
                    for(var k=0; k<elRow.cells.length; k++) {

                        //var elCell = elRow.cells[l];
                        //elCell.id = this.id+"-bdrow"+k+"-cell"+l;
                        //TODO: can we parse a column with null key?
                        oRecord[oColumnSet.keys[k].key] = oColumnSet.keys[k].parse(elRow.cells[k].innerHTML);
                    }
                    aRecords.push(oRecord);
                }
            }
            this._oRecordSet.addRecords(aRecords);
            // Then re-do the markup
            this._initTable();
            //TODO: use paginate this.appendRows(this._oRecordSet.getRecords());
            this.paginate();
        }
        // Create markup from scratch using the provided DataSource
        else if(this.dataSource) {
                this._initTable();
                // Send out for data in an asynchronous request
                oDataSource.sendRequest(this.initialRequest, this.onDataReturnPaginate, this);
        }
        // Else there is no data
        else {
            this._initTable();
            this.showEmptyMessage();
        }
    }
    // Container element not found in document
    else {
        YAHOO.log("Could not instantiate DataTable due to an invalid container element", "error", this.toString());
        return;
    }

    // Set up sort
    this.subscribe("headCellClickEvent",this.onEventSortColumn);

    // Set up context menu
    //TODO: does trigger have to exist? can trigger be TBODY rather than rows?
    if(this.contextMenu && this.contextMenuOptions) {
        this.contextMenu = new YAHOO.widget.ContextMenu(this.id+"-cm", { trigger: this._elBody.rows } );
        this.contextMenu.addItem("delete item");
        this.contextMenu.render(document.body);
    }

    // Set up event model
    elTable = this._elTable;
    /////////////////////////////////////////////////////////////////////////////
    //
    // DOM Events
    //
    /////////////////////////////////////////////////////////////////////////////
    //YAHOO.util.Event.addListener(this._elContainer, "focus", this._onFocus, this);
    YAHOO.util.Event.addListener(elTable, "click", this._onClick, this);
    YAHOO.util.Event.addListener(elTable, "dblclick", this._onDoubleclick, this);
    YAHOO.util.Event.addListener(elTable, "mouseout", this._onMouseout, this);
    YAHOO.util.Event.addListener(elTable, "mouseover", this._onMouseover, this);
    YAHOO.util.Event.addListener(elTable, "mousedown", this._onMousedown, this);
    //YAHOO.util.Event.addListener(elTable, "mouseup", this._onMouseup, this);
    //YAHOO.util.Event.addListener(elTable, "mousemove", this._onMousemove, this);
    YAHOO.util.Event.addListener(elTable, "keydown", this._onKeydown, this);
    //YAHOO.util.Event.addListener(elTable, "keypress", this._onKeypress, this);
    YAHOO.util.Event.addListener(document, "keyup", this._onKeyup, this);
    //YAHOO.util.Event.addListener(elTable, "focus", this._onFocus, this);
    YAHOO.util.Event.addListener(elTable, "blur", this._onBlur, this);

    /////////////////////////////////////////////////////////////////////////////
    //
    // Custom Events
    //
    /////////////////////////////////////////////////////////////////////////////

    /**
     * Fired when a mouseover occurs on a TD element.
     *
     * @event cellMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */
    this.createEvent("cellMouseoverEvent");

    /**
     * Fired when a TH cell element is mouseover.
     *
     * @event headCellMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     *
     */
    this.createEvent("headCellMouseoverEvent");

    /**
     * Fired when a TABLE element is mouseover.
     *
     * @event tableMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("tableMouseoverEvent");

    /**
     * Fired when a mousedown occurs on a TD element.
     *
     * @event cellMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */
    this.createEvent("cellMousedownEvent");

    /**
     * Fired when a TH cell element is mousedown.
     *
     * @event headCellMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */
    this.createEvent("headCellMousedownEvent");

    /**
     * Fired when a TABLE element is mousedown.
     *
     * @event tableMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("tableMousedownEvent");

    /**
     * Fired when a CHECKBOX element is clicked.
     *
     * @event checkboxClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The CHECKBOX element.
     */
    this.checkboxClickEvent = this.createEvent("checkboxClickEvent");
    //this.checkboxClickEvent.subscribeEvent.subscribe(this._registerEvent,{type:"checkboxClickEvent"},this);

    /**
     * Fired when a RADIO element is clicked.
     *
     * @event radioClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The RADIO element.
     */
    this.createEvent("radioClickEvent");
    
    /**
     * Fired when a TD element is clicked.
     *
     * @event cellClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */
    this.createEvent("cellClickEvent");

    /**
     * Fired when a TH cell element is clicked.
     *
     * @event headCellClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */
    this.createEvent("headCellClickEvent");

    /**
     * Fired when a TABLE element is clicked.
     *
     * @event tableClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("tableClickEvent");

    /**
     * Fired when a TD element is doubleclicked.
     *
     * @event cellDoublcickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */
    this.createEvent("cellDoubleclickEvent");

    /**
     * Fired when a TH cell element is doubleclicked.
     *
     * @event headCellDoubleclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */
    this.createEvent("headCellDoubleclickEvent");

    /**
     * Fired when a TABLE element is doubleclicked.
     *
     * @event tableDoubleclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("tableDoubleclickEvent");

    /**
     * Fired when up-arrow is typed.
     *
     * @event arrowUpEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("arrowUpEvent");

    /**
     * Fired when down-arrow is typed.
     *
     * @event arrowDownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TABLE element.
     *
     */
    this.createEvent("arrowDownEvent");

    /**
     * Fired when a column is resized.
     *
     * @event columnResizeEvent
     * @param oArgs.target {HTMLElement} The TH element.
     */
    this.createEvent("columnResizeEvent");

    /**
     * Fired when a paginator element is clicked.
     *
     * @event pagerClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The paginator element.
     *
     */
    this.createEvent("pagerClickEvent");

    /**
     * Fired when an element is selected.
     *
     * @event selectEvent
     * @param oArgs.els {Array} An array of the selected element(s).
     */
    this.createEvent("selectEvent");

    /**
     * Fired when an element is unselected.
     *
     * @event unselectEvent
     * @param oArgs.els {Array} An array of the unselected element(s).
     */
    this.createEvent("unselectEvent");

    /**
     * Fired when a TR element is deleted.
     *
     * @event rowDeleteEvent
     * @param oArgs.rowIndex {Number || Array} The index(es) of the deleted row(s).
     * @param oArgs.rowId {String || Array} DOM ID(s) of the deleted row(s).
     * @param oArgs.recordId {String || Array} The Record ID(s) of the deleted row(s).
     */
    this.createEvent("rowDeleteEvent");
    this.subscribe("rowDeleteEvent", this._onRowDelete);
    
    
    
    
    YAHOO.widget.DataTable._nCount++;
    YAHOO.log("DataTable initialized", "info", this.toString());
};

if(YAHOO.util.EventProvider) {
    YAHOO.augment(YAHOO.widget.DataTable, YAHOO.util.EventProvider);
}
else {
    YAHOO.log("Missing dependency: YAHOO.util.EventProvider","error",this.toString());
}

/////////////////////////////////////////////////////////////////////////////
//
// Public constants
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Class name assigned to TBODY element that holds data rows.
 *
 * @property CLASS_BODY
 * @type String
 * @static
 * @final
 * @default "yui-dt-body"
 */
YAHOO.widget.DataTable.CLASS_BODY = "yui-dt-body";

/**
 * Class name assigned to container element within THEAD.
 *
 * @property CLASS_HEADCONTAINER
 * @type String
 * @static
 * @final
 */
YAHOO.widget.DataTable.CLASS_HEADCONTAINER = "yui-dt-headcontainer";

/**
 * Class name assigned to resizer handle element within THEAD.
 *
 * @property CLASS_HEADRESIZER
 * @type String
 * @static
 * @final
 * @default "yui-dt-headresizer"
 */
YAHOO.widget.DataTable.CLASS_HEADRESIZER = "yui-dt-headresizer";

/**
 * Class name assigned to text displayed within THEAD.
 *
 * @property CLASS_HEADTEXT
 * @type String
 * @static
 * @final
 * @default "yui-dt-headtext"
 */
YAHOO.widget.DataTable.CLASS_HEADTEXT = "yui-dt-headtext";

/**
 * Class name assigned to even TR elements.
 *
 * @property CLASS_EVEN
 * @type String
 * @static
 * @final
 * @default "yui-dt-even
 */
YAHOO.widget.DataTable.CLASS_EVEN = "yui-dt-even";

/**
 * Class name assigned to odd TR elements.
 *
 * @property CLASS_ODD
 * @type String
 * @static
 * @final
 * @default "yui-dt-odd"
 */
YAHOO.widget.DataTable.CLASS_ODD = "yui-dt-odd";

/**
 * Class name assigned to empty elements.
 *
 * @property CLASS_EMPTY
 * @type String
 * @static
 * @final
 * @default "yui-dt-empty"
 */
YAHOO.widget.DataTable.CLASS_EMPTY = "yui-dt-empty";

/**
 * Class name assigned to loading message.
 *
 * @property CLASS_LOADING
 * @type String
 * @static
 * @final
 * @default "yui-dt-loading"
 */
YAHOO.widget.DataTable.CLASS_LOADING = "yui-dt-loading";

/**
 * Class name assigned to selected elements.
 *
 * @property CLASS_SELECTED
 * @type String
 * @static
 * @final
 * @default "yui-dt-selected"
 */
YAHOO.widget.DataTable.CLASS_SELECTED = "yui-dt-selected";

/**
 * Class name assigned to certain elements of a scrollable DataTable.
 *
 * @property CLASS_SCROLLABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-scrollable"
 */
YAHOO.widget.DataTable.CLASS_SCROLLABLE = "yui-dt-scrollable";

/**
 * Class name assigned to column headers of sortable Columns.
 *
 * @property CLASS_SORTABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-sortable"
 */
YAHOO.widget.DataTable.CLASS_SORTABLE = "yui-dt-sortable";

/**
 * Class name assigned to column headers when sorted in ascending order.
 *
 * @property CLASS_SORTEDBYASC
 * @type String
 * @static
 * @final
 * @default "yui-dt-sortedbyasc"
 */
YAHOO.widget.DataTable.CLASS_SORTEDBYASC = "yui-dt-sortedbyasc";

/**
 * Class name assigned to column headers when sorted in descending order.
 *
 * @property CLASS_SORTEDBYDESC
 * @type String
 * @static
 * @final
 * @default "yui-dt-sortedbydesc"
 */
YAHOO.widget.DataTable.CLASS_SORTEDBYDESC = "yui-dt-sortedbydesc";

/**
 * Class name assigned to the pagination link "&lt;&lt;".
 *
 * @property CLASS_FIRSTLINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-firstlink"
 */
YAHOO.widget.DataTable.CLASS_FIRSTLINK = "yui-dt-firstlink";

/**
 * Class name assigned to the pagination link "&lt;&lt;" when it is disabled.
 *
 * @property CLASS_FIRSTPAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-firstpage"
 */
YAHOO.widget.DataTable.CLASS_FIRSTPAGE = "yui-dt-firstpage";

/**
 * Class name assigned to the pagination link "&gt;&gt;".
 *
 * @property CLASS_LASTLINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-lastlink"
 */
YAHOO.widget.DataTable.CLASS_LASTLINK = "yui-dt-lastlink";

/**
 * Class name assigned to the pagination link "&gt;&gt;" when it is disabled.
 *
 * @property CLASS_LASTPAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-lastpage"
 */
YAHOO.widget.DataTable.CLASS_LASTPAGE = "yui-dt-lastpage";

/**
 * Class name assigned to the pagination link "&lt;".
 *
 * @property CLASS_PREVLINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-prevlink"
 */
YAHOO.widget.DataTable.CLASS_PREVLINK = "yui-dt-prevlink";

/**
 * Class name assigned to the pagination link "&lt;" when it is disabled.
 *
 * @property CLASS_PREVPAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-prevpage"
 */
YAHOO.widget.DataTable.CLASS_FIRSTPAGE = "yui-dt-prevpage";

/**
 * Class name assigned to the pagination link "&gt;".
 *
 * @property CLASS_NEXTLINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-nextlink"
 */
YAHOO.widget.DataTable.CLASS_NEXTLINK = "yui-dt-nextlink";

/**
 * Class name assigned to the pagination link "&gt;" when it is disabled.
 *
 * @property CLASS_NEXTPAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-nextpage"
 */
YAHOO.widget.DataTable.CLASS_NEXTPAGE = "yui-dt-nextpage";


/**
 * Class name assigned to pagination links to specific page numbers.
 *
 * @property CLASS_PAGELINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-pagelink"
 */
YAHOO.widget.DataTable.CLASS_PAGELINK = "yui-dt-pagelink";

/**
 * Class name assigned to pagination links for specific page numbers that are disabled.
 *
 * @property CLASS_CURRENTPAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-currentpage"
 */
YAHOO.widget.DataTable.CLASS_CURRENTPAGE = "yui-dt-currentpage";

/**
 * Class name assigned to the pagination SELECT element.
 *
 * @property CLASS_PAGESELECT
 * @type String
 * @static
 * @final
 * @default "yui-dt-pageselect"
 */
YAHOO.widget.DataTable.CLASS_PAGESELECT = "yui-dt-pageselect";

/**
 * Class name assigned to the pagination links container element.
 *
 * @property CLASS_PAGELINKS
 * @type String
 * @static
 * @final
 * @default "yui-dt-pagelinks"
 */
YAHOO.widget.DataTable.CLASS_PAGELINKS = "yui-dt-pagelinks";

/**
 * Class name assigned to editable TD elements.
 *
 * @property CLASS_EDITABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-editable"
 */
YAHOO.widget.DataTable.CLASS_EDITABLE = "yui-dt-editable";

/**
 * Class name assigned to TD elements of type "checkbox".
 *
 * @property CLASS_CHECKBOX
 * @type String
 * @static
 * @final
 * @default "yui-dt-checkbox"
 */
YAHOO.widget.DataTable.CLASS_CHECKBOX = "yui-dt-checkbox";

/**
 * Class name assigned to TD elements of type "currency".
 *
 * @property CLASS_CURRENCY
 * @type String
 * @static
 * @final
 * @default "yui-dt-currency"
 */
YAHOO.widget.DataTable.CLASS_CURRENCY = "yui-dt-currency";

/**
 * Class name assigned to TD elements of type "date".
 *
 * @property CLASS_DATE
 * @type String
 * @static
 * @final
 * @default "yui-dt-date"
 */
YAHOO.widget.DataTable.CLASS_DATE = "yui-dt-date";

/**
 * Class name assigned to TD elements of type "email".
 *
 * @property CLASS_EMAIL
 * @type String
 * @static
 * @final
 * @default "yui-dt-email"
 */
YAHOO.widget.DataTable.CLASS_EMAIL = "yui-dt-email";

/**
 * Class name assigned to TD elements of type "link".
 *
 * @property CLASS_LINK
 * @type String
 * @static
 * @final
 * @default "yui-dt-link"
 */
YAHOO.widget.DataTable.CLASS_LINK = "yui-dt-link";

/**
 * Class name assigned to TD elements of type "number".
 *
 * @property CLASS_NUMBER
 * @type String
 * @static
 * @final
 * @default "yui-dt-number"
 */
YAHOO.widget.DataTable.CLASS_NUMBER = "yui-dt-number";

/**
 * Class name assigned to TD elements of type "string".
 *
 * @property CLASS_STRING
 * @type String
 * @static
 * @final
 * @default "yui-dt-string"
 */
YAHOO.widget.DataTable.CLASS_STRING = "yui-dt-string";

/**
 * Message to display if DataTable has no data.
 *
 * @property MSG_EMPTY
 * @type String
 * @static
 * @final
 * @default "No records found."
 */
YAHOO.widget.DataTable.MSG_EMPTY = "No records found.";

/**
 * Message to display while DataTable is loading data.
 *
 * @property MSG_LOADING
 * @type String
 * @static
 * @final
 * @default "Loading data..."
 */
YAHOO.widget.DataTable.MSG_LOADING = "Loading data...";

/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal class variable to index multiple DataTable instances.
 *
 * @property _nCount
 * @type Number
 * @private
 * @static
 */
YAHOO.widget.DataTable._nCount = 0;

/**
 * Instance index.
 *
 * @property _nIndex
 * @type Number
 * @private
 */
YAHOO.widget.DataTable.prototype._nIndex = null;

/**
 * Unique instance name.
 *
 * @property _sName
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sName = null;

//TODO: convert these to public members

/**
 * Container element reference. Is null unless the TABLE is built from scratch into the
 * provided container.
 *
 * @property _elContainer
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elContainer = null;

/**
 * TABLE element reference.
 *
 * @property _elTable
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elTable = null;

/**
 * TBODY element reference.
 *
 * @property _elBody
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elBody = null;

/**
 * ColumnSet instance.
 *
 * @property _oColumnSet
 * @type YAHOO.widget.ColumnSet
 * @private
 */
YAHOO.widget.DataTable.prototype._oColumnSet = null;

/**
 * RecordSet instance.
 *
 * @property _oRecordSet
 * @type YAHOO.widget.RecordSet
 * @private
 */
YAHOO.widget.DataTable.prototype._oRecordSet = null;

/**
 * Array of Records that are in the selected state.
 *
 * @property _aSelectedRecords
 * @type YAHOO.widget.Record[]
 * @private
 */
YAHOO.widget.DataTable.prototype._aSelectedRecords = [];

/**
 * Internal variable to track whether widget has focus.
 *
 * @property _bFocused
 * @type Boolean
 * @private
 */
YAHOO.widget.DataTable.prototype._bFocused = false;

/**
 * Total number of pages, calculated on the fly.
 *
 * @property _totalPages
 * @type Number
 * @private
 */
YAHOO.widget.DataTable.prototype._totalPages = null;


/////////////////////////////////////////////////////////////////////////////
//
// Private methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Creates HTML markup for TABLE, THEAD, TBODY.
 *
 * @method _initTable
 * @private
 */
YAHOO.widget.DataTable.prototype._initTable = function() {
    // Clear the container
    this._elContainer.innerHTML = "";

    // Set up scrolling
    if(this.scrollable) {
        //TODO: conf height
        YAHOO.util.Dom.addClass(this._elContainer,YAHOO.widget.DataTable.CLASS_SCROLLABLE);
    }

    // Create TABLE
    this._elTable = this._elContainer.appendChild(document.createElement("table"));
    var elTable = this._elTable;
    elTable.tabIndex = 0;

    // Create SUMMARY, if applicable
    if(this.summary) {
        elTable.summary = this.summary;
    }

    // Create CAPTION, if applicable
    if(this.caption) {
        this._elCaption = elTable.appendChild(document.createElement("caption"));
        this._elCaption.innerHTML = this.caption;
    }

    // Create THEAD
    this._initHead(elTable, this._oColumnSet);


    // Create TBODY for messages
    var elMsgBody = document.createElement("tbody");
    elMsgBody.tabIndex = -1;
    this._elMsgRow = elMsgBody.appendChild(document.createElement("tr"));
    var elMsgRow = this._elMsgRow;
    var elMsgCell = elMsgRow.appendChild(document.createElement("td"));
    elMsgCell.colSpan = this._oColumnSet.keys.length;
    this._elMsgCell = elMsgCell;
    this._elMsgBody = elTable.appendChild(elMsgBody);
    this.showLoadingMessage();

    // Create TBODY for data
    this._elBody = elTable.appendChild(document.createElement("tbody"));
    this._elBody.tabIndex = -1;
    YAHOO.util.Dom.addClass(this._elBody,YAHOO.widget.DataTable.CLASS_BODY);
    if(this.scrollable) {
        YAHOO.util.Dom.addClass(this._elBody,YAHOO.widget.DataTable.CLASS_SCROLLABLE);
    }
};

/**
 * Populates THEAD element with TH cells as defined by ColumnSet.
 *
 * @method _initHead
 * @private
 */
YAHOO.widget.DataTable.prototype._initHead = function() {
    var i;
    
    // Create THEAD
    var elHead = document.createElement("thead");
    elHead.tabIndex = -1;

    // Iterate through each row of Column headers...
    var colTree = this._oColumnSet.tree;
    for(i=0; i<colTree.length; i++) {
        var elHeadRow = elHead.appendChild(document.createElement("tr"));
        elHeadRow.id = this.id+"-hdrow"+i;

        // ...and create THEAD cells
        for(var j=0; j<colTree[i].length; j++) {
            var oColumn = colTree[i][j];
            var elHeadCell = elHeadRow.appendChild(document.createElement("th"));
            elHeadCell.id = oColumn.getId();
            this._initHeadCell(elHeadCell,oColumn,i,j);
        }
    }

    this._elHead = this._elTable.appendChild(elHead);
    
    // Add Resizer only after DOM has been updated...
    // ...and skip the last column
    for(i=0; i<this._oColumnSet.keys.length-1; i++) {
        var oColumn = this._oColumnSet.keys[i];
        if(oColumn.resizeable && YAHOO.util.DD) {
            //TODO: deal with fixed width tables
            //TODO: no more oColumn.isLast
            if(!this.fixedWidth || (this.fixedwidth && !oColumn.isLast)) {
                // TODO: better way to get elHeadContainer
                var elHeadContainer = (YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_HEADCONTAINER,"div",YAHOO.util.Dom.get(oColumn.getId())))[0];
                var elHeadResizer = elHeadContainer.appendChild(document.createElement("span"));
                elHeadResizer.id = oColumn.getId() + "-resizer";
                YAHOO.util.Dom.addClass(elHeadResizer,YAHOO.widget.DataTable.CLASS_HEADRESIZER);
                oColumn.ddResizer = new YAHOO.util.WidthResizer(
                        this, oColumn.getId(), elHeadResizer.id, elHeadResizer.id);
                var cancelClick = function(e) {
                    YAHOO.util.Event.stopPropagation(e);
                };
                YAHOO.util.Event.addListener(elHeadResizer,"click",cancelClick);
            }
            if(this.fixedWidth) {
                elHeadContainer.style.overflow = "hidden";
                elHeadContent.style.overflow = "hidden";
            }
        }
    }

    YAHOO.log("THEAD with " + this._oColumnSet.keys.length + " columns created","info",this.toString());
};

/**
 * Populates TH cell as defined by Column.
 *
 * @method _initHeadCell
 * @param elHeadCell {HTMLElement} TH cell element reference.
 * @param oColumn {YAHOO.widget.Column} Column object.
 * @param row {number} Row index.
 * @param col {number} Column index.
 * @private
 */
YAHOO.widget.DataTable.prototype._initHeadCell = function(elHeadCell,oColumn,row,col) {
    // Clear out the cell of prior content
    // TODO: purgeListeners and other validation-related things
    var index = this._nIndex;
    elHeadCell.columnIndex = col;
    if(oColumn.abbr) {
        elHeadCell.abbr = oColumn.abbr;
    }
    if(oColumn.width) {
        elHeadCell.style.width = oColumn.width;
    }
    if(oColumn.className) {
        YAHOO.util.Dom.addClass(elHeadCell,oColumn.className);
    }

    elHeadCell.innerHTML = "";

    var elHeadContainer = elHeadCell.appendChild(document.createElement("div"));
    elHeadContainer.id = this.id+"-hdrow"+row+"-container"+col;
    YAHOO.util.Dom.addClass(elHeadContainer,YAHOO.widget.DataTable.CLASS_HEADCONTAINER);
    var elHeadContent = elHeadContainer.appendChild(document.createElement("span"));
    elHeadContent.id = this.id+"-hdrow"+row+"-text"+col;
    YAHOO.util.Dom.addClass(elHeadContent,YAHOO.widget.DataTable.CLASS_HEADTEXT);

    elHeadCell.rowSpan = oColumn.getRowSpan();
    elHeadCell.colSpan = oColumn.getColSpan();

    var contentText = oColumn.text || oColumn.key || "";
    if(oColumn.sortable) {
        YAHOO.util.Dom.addClass(elHeadContent,YAHOO.widget.DataTable.CLASS_SORTABLE);
        //TODO: Make hash configurable to be a server link
        //TODO: Make title configurable
        //TODO: Separate contentText from an accessibility link that says
        // Click to sort ascending and push it offscreen
        elHeadContent.innerHTML = "<a href=\"#\" title=\"Click to sort\">" + contentText + "</a>";
         //elHeadContent.innerHTML = contentText;

    }
    else {
        elHeadContent.innerHTML = contentText;
    }
};

/**
 * Restripes rows by applying class YAHOO.widget.DataTable.CLASS_EVEN or
 * YAHOO.widget.DataTable.CLASS_ODD.
 *
 * @method _restripeRows
 * @param range {Number} (optional) Range defines a subset of rows to restripe.
 * @private
 */
YAHOO.widget.DataTable.prototype._restripeRows = function(range) {
    if(!range) {
        var rows = this._elBody.rows;
        for(var i=0; i<rows.length; i++) {
            if(i%2) {
                YAHOO.util.Dom.removeClass(rows[i], YAHOO.widget.DataTable.CLASS_EVEN);
                YAHOO.util.Dom.addClass(rows[i], YAHOO.widget.DataTable.CLASS_ODD);
            }
            else {
                YAHOO.util.Dom.removeClass(rows[i], YAHOO.widget.DataTable.CLASS_ODD);
                YAHOO.util.Dom.addClass(rows[i], YAHOO.widget.DataTable.CLASS_EVEN);
            }
        }
    }
    else {
        //TODO: allow restriping of a subset of rows for performance
    }
};

/**
 * Sets elements to selected state. Does not fire any events.
 *
 * @method _select
 * @param els {HTMLElement[] | String[]} Array of HTML elements by reference or ID string.
 * @private
 */
YAHOO.widget.DataTable.prototype._select = function(els) {
//TODO: put els in an array if it is just one element?
    for(var i=0; i<els.length; i++) {
        // Set the style
        YAHOO.util.Dom.addClass(YAHOO.util.Dom.get(els[i]),YAHOO.widget.DataTable.CLASS_SELECTED);
    }
    this._lastSelected = els[els.length-1];
};

/**
 * Sets elements to the unselected state. Does not fire any events.
 *
 * @method _unselect
 * @param els {HTMLElement[] | String[]} Array of HTML elements by reference or ID string.
 * @private
 */
YAHOO.widget.DataTable.prototype._unselect = function(els) {
//TODO: put els in an array if it is just one element?
    var array = this._aSelectedRecords;
    for(var i=0; i<els.length; i++) {
        // Remove the style
        YAHOO.util.Dom.removeClass(YAHOO.util.Dom.get(els[i]),YAHOO.widget.DataTable.CLASS_SELECTED);
    }
};

/**
 * Unselects all selected rows.
 *
 * @method _unselectAllRows
 * @private
 */
YAHOO.widget.DataTable.prototype._unselectAllRows = function() {
    var selectedRows = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"tr",this._elBody);
    this._unselect(selectedRows);
};

/**
 * Unselects all selected cells.
 *
 * @method _unselectAllCells
 * @private
 */
YAHOO.widget.DataTable.prototype._unselectAllCells = function() {
    var selectedCells = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"td",this._elBody);
    this._unselect(selectedCells);
};


/////////////////////////////////////////////////////////////////////////////
//
// Private DOM Event Handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Handles blur events on the TABLE element.
 *
 * @method _onBlur
 * @param e {HTMLEvent} The mouseover event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onBlur = function(e, oSelf) {
    this._bFocused = false;
};

/**
 * Handles mouseover events on the TABLE element.
 *
 * @method _onMouseover
 * @param e {HTMLEvent} The mouseover event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onMouseover = function(e, oSelf) {
	    var elTarget = YAHOO.util.Event.getTarget(e);
	    var elTag = elTarget.nodeName.toLowerCase();
	    var knownTag = false;

        if (elTag != "table") {
            while(!knownTag) {
                switch(elTag) {
                    case "body":
                        knownTag = true;
                        break;
                    case "td":
    	                oSelf.fireEvent("cellMouseoverEvent",{target:elTarget,event:e});
    	                knownTag = true;
    	                break;
        	        case "th":
                    	oSelf.fireEvent("headCellMouseoverEvent",{target:elTarget,event:e});
                    	knownTag = true;
                    	break;
                    default:
                        break;
                }
                elTarget = elTarget.parentNode;
                if(elTarget) {
                    elTag = elTarget.nodeName.toLowerCase();
                }
                else {
                    break;
                }
            }
        }
	    oSelf.fireEvent("tableMouseoverEvent",{target:elTarget,event:e});
};

/**
 * Handles mousedown events on the TABLE element.
 *
 * @method _onMousedown
 * @param e {HTMLEvent} The mouseover event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onMousedown = function(e, oSelf) {
        //YAHOO.util.Event.stopEvent(e);
	    var elTarget = YAHOO.util.Event.getTarget(e);
	    var elTag = elTarget.nodeName.toLowerCase();
	    var knownTag = false;

        if (elTag != "table") {
            while(!knownTag) {
                switch(elTag) {
                    case "body":
                        knownTag = true;
                        break;
                    case "td":
    	               oSelf.fireEvent("cellMousedownEvent",{target:elTarget,event:e});
    	               knownTag = true;
    	               break;
        	        case "th":
                    	oSelf.fireEvent("headCellMousedownEvent",{target:elTarget,event:e});
                    	knownTag = true;
                    	break;
                    default:
                        break;
                }
                elTarget = elTarget.parentNode;
                if(elTarget) {
                    elTag = elTarget.nodeName.toLowerCase();
                }
                else {
                    break;
                }
            }
        }
	    oSelf.fireEvent("tableMousedownEvent",{target:elTarget,event:e});
};

/**
 * Handles click events on the TABLE element.
 *
 * @method _onClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.nodeName.toLowerCase();
    var knownTag = false; // True if event should stop propagating

    if(oSelf.activeEditor) { //&& (oSelf.activeEditor.column != column)
        oSelf.activeEditor.hide();
        oSelf.activeEditor = null;

        // Editor causes widget to lose focus
        oSelf._bFocused = false;
        oSelf.focusTable();
    }

    if (elTag != "table") {
        while(!knownTag) {
            switch(elTag) {
                case "body":
                    knownTag = true;
                    break;
                case "input":
                    if(elTarget.type.toLowerCase() == "checkbox") {
                        oSelf.fireEvent("checkboxClickEvent",{target:elTarget,event:e});
                    }
                    else if(elTarget.type.toLowerCase() == "radio") {
                        oSelf.fireEvent("radioClickEvent",{target:elTarget,event:e});
                    }
                    knownTag = true;
                    break;
                case "td":
	               oSelf.fireEvent("cellClickEvent",{target:elTarget,event:e});
	               knownTag = true;
	               break;
    	        case "th":
                	oSelf.fireEvent("headCellClickEvent",{target:elTarget,event:e});
                	knownTag = true;
                	break;
                default:
                    break;
            }
            elTarget = elTarget.parentNode;
            elTag = elTarget.nodeName.toLowerCase();
        }
    }
    oSelf.focusTable();
    oSelf.fireEvent("tableClickEvent",{target:elTarget,event:e});
};

/**
 * Handles doubleclick events on the TABLE element.
 *
 * @method _onDoubleclick
 * @param e {HTMLEvent} The doubleclick event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onDoubleclick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.nodeName.toLowerCase();
    var knownTag = false;

    if(oSelf.activeEditor) { //&& (oSelf.activeEditor.column != column)
        oSelf.activeEditor.hide();
        oSelf.activeEditor = null;
        
        // Editor causes widget to lose focus
        oSelf._bFocused = false;
        oSelf.focusTable();
    }

    if (elTag != "table") {
        while(!knownTag) {
            switch(elTag) {
                case "body":
                    knownTag = true;
                    break;
                case "td":
	                oSelf.fireEvent("cellDoubleclickEvent",{target:elTarget,event:e});
	                knownTag = true;
	                break;
    	        case "th":
                	oSelf.fireEvent("headCellDoubleclickEvent",{target:elTarget,event:e});
                	knownTag = true;
                	break;
                default:
                    break;
            }
            elTarget = elTarget.parentNode;
            elTag = elTarget.nodeName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableDoubleclickEvent",{target:elTarget,event:e});
};

/**
 * Handles keydown events on the TABLE.
 *
 * @method _onKeydown
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onKeydown = function(e, oSelf) {
    var oldSelected = oSelf._lastSelected;
    // Only move selection if one is already selected
    // TODO: config to allow selection even if one is NOT already selected
    // TODO: if something isn't selected already, arrow key should select first or last one
    if(oldSelected && oSelf.isSelected(oldSelected)) {
        var newSelected;
        // arrow down
        if(e.keyCode == 40) {
            // row mode
            if(oldSelected.nodeName.toLowerCase() == "tr") {
                // We have room to move down
                if(oldSelected.sectionRowIndex+1 < oSelf._elBody.rows.length) {
                            if(!e.shiftKey) {
                                oSelf.unselectAllRows();
                            }
                            newSelected = oSelf._elBody.rows[oldSelected.sectionRowIndex+1];
                            oSelf.select(newSelected);
                            
                }
            }
            // cell mode
            else if(oldSelected.nodeName.toLowerCase() == "td") {
                /*// We have room to move down
                if(oldSelected.sectionRowIndex+1 < oSelf._elBody.rows.length) {
                            if(!e.shiftKey) {
                                oSelf.unselectAllRows();
                            }
                            newSelected = oSelf._elBody.rows[oldSelected.sectionRowIndex+1];
                            oSelf.select(newSelected);
                }*/
            }
            // Arrows can cause widget to lose focus
            oSelf._bFocused = false;
            oSelf.focusTable();
        }
        // arrow up
        else if(e.keyCode == 38) {
            // row mode
            if(oldSelected.nodeName.toLowerCase() == "tr") {
                // We have room to move up
                if((oldSelected.sectionRowIndex > 0)) {
                            if(!e.shiftKey) {
                                oSelf.unselectAllRows();
                            }
                            newSelected = oSelf._elBody.rows[oldSelected.sectionRowIndex-1];
                            oSelf.select(newSelected);
                }
            }
            // cell mode
            else if(oldSelected.nodeName.toLowerCase() == "td") {
                // We have room to move up
                if((oldSelected.sectionRowIndex > 0)) {
                            if(!e.shiftKey) {
                                oSelf.unselectAllRows();
                            }
                            newSelected = oSelf._elBody.rows[oldSelected.sectionRowIndex-1];
                            oSelf.select(newSelected);
                }
            }
            // Arrows can cause widget to lose focus
            oSelf._bFocused = false;
            oSelf.focusTable();
        }
    }
};

/**
 * Handles keyup events on the DOCUMENT.
 *
 * @method _onKeyup
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onKeyup = function(e, oSelf) {
    // esc Clears active editor
    if((e.keyCode == 27) && (oSelf.activeEditor)) {
        oSelf.activeEditor.hide();
        oSelf.activeEditor = null;
        
        // Editor causes widget to lose focus
        oSelf._bFocused = false;
        oSelf.focusTable();
    }
    // enter Saves active editor data
    if((e.keyCode == 13) && (oSelf.activeEditor)) {
        var elCell = oSelf.activeEditor.cell;
        var oColumn = oSelf.activeEditor.column;
        var oRecord = oSelf.activeEditor.record;
        var newValue = oSelf.activeEditor.getValue();
        //TODO: Column.key may be null!
        oRecord[oColumn.key] = newValue;
        oSelf.formatCell(elCell);

        oSelf.activeEditor.hide();
        oSelf.activeEditor = null;

        // Editor causes widget to lose focus
        oSelf._bFocused = false;
        oSelf.focusTable();
    }
};

/**
 * Handles click events on paginator links.
 *
 * @method _onPagerClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onPagerClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.nodeName.toLowerCase();
    var knownTag = false; // True if event should stop propagating

    if (elTag != "table") {
        while(!knownTag) {
            switch(elTag) {
                case "body":
                    knownTag = true;
                    break;
                case "a":
                    switch(elTarget.className) {
                        case YAHOO.widget.DataTable.CLASS_PAGELINK:
                            oSelf.showPage(parseInt(elTarget.innerHTML,10));
                            break;
                        case YAHOO.widget.DataTable.CLASS_FIRSTLINK:
                            oSelf.showPage(1);
                            break;
                        case YAHOO.widget.DataTable.CLASS_LASTLINK:
                            oSelf.showPage(oSelf._totalPages);
                            break;
                        case YAHOO.widget.DataTable.CLASS_PREVLINK:
                            oSelf.showPage(oSelf.pageCurrent-1);
                            break;
                        case YAHOO.widget.DataTable.CLASS_NEXTLINK:
                            oSelf.showPage(oSelf.pageCurrent+1);
                            break;
                    }
                    knownTag = true;
                    break;
                default:
                    break;
            }
            elTarget = elTarget.parentNode;
            if(elTarget) {
                elTag = elTarget.nodeName.toLowerCase();
            }
            else {
                break;
            }
        }
    }
    oSelf.fireEvent("pagerClickEvent",{target:elTarget,event:e});
};

/**
 * Handles change events on paginator SELECT.
 *
 * @method _onPagerSelect
 * @param e {HTMLEvent} The change event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onPagerSelect = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.nodeName.toLowerCase();

    // How many rows per page
    var rowsPerPage = parseInt(elTarget[elTarget.selectedIndex].text,10);
    if(rowsPerPage && (rowsPerPage != oSelf.rowsPerPage)) {
        oSelf.rowsPerPage = rowsPerPage;
        oSelf.paginate();
    }

}

/////////////////////////////////////////////////////////////////////////////
//
// Private Custom Event Handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Handles row delete events.
 *
 * @method _onRowDelete
 * @param oArgs.rowIndex {Number || Number[]} The index(es) of the deleted row(s).
 * @param oArgs.rowId {String || String[]} DOM ID(s) of the deleted row(s).
 * @param oArgs.recordId {String || String[]} The Record ID(s) of the deleted row(s).
 * @private
 */
YAHOO.widget.DataTable.prototype._onRowDelete = function(oArgs) {
    this._restripeRows();
};

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * DataSource instance.
 *
 * @property dataSource
 * @type YAHOO.util.DataSource
 */
YAHOO.widget.DataTable.prototype.dataSource = null;

/**
 * Initial request to send to DataSource.
 *
 * @property initialRequest
 * @type String
 * @default ""
 */
YAHOO.widget.DataTable.prototype.initialRequest = "";

/**
 * Defines value of CAPTION attribute.
 *
 * @property caption
 * @type String
 */
YAHOO.widget.DataTable.prototype.caption = null;

/**
 * Defines value of SUMMARY attribute.
 *
 * @property summary
 * @type String
 */
YAHOO.widget.DataTable.prototype.summary = null;

/**
 * True if DataTable's width is a fixed size.
 *
 * @property fixedWidth
 * @type Boolean
 * @default false
 */
YAHOO.widget.DataTable.prototype.fixedWidth = false;

/**
 * True if TBODY should scroll while THEAD remains fixed.
 *
 * @property scrollable
 * @type Boolean
 * @default false
 */
YAHOO.widget.DataTable.prototype.scrollable = false;

/**
 * True if only one row may be selected at a time.
 *
 * @property singleSelect
 * @type Boolean
 * @default false
 */
YAHOO.widget.DataTable.prototype.singleSelect = false;

/**
 * ContextMenu instance.
 *
 * @property contextMenu
 * @type YAHOO.widget.ContextMenu
 */
YAHOO.widget.DataTable.prototype.contextMenu = null;

/**
 * Current page number.
 *
 * @property pageCurrent
 * @type Number
 * @default 1
 */
YAHOO.widget.DataTable.prototype.pageCurrent = 1;

/**
 * Rows per page.
 *
 * @property rowsPerPage
 * @type Number
 * @default 500
 */
YAHOO.widget.DataTable.prototype.rowsPerPage = 500;

/**
 * Record index of first row of current page.
 *
 * @property startRecordIndex
 * @type Number
 * @default 1
 */
YAHOO.widget.DataTable.prototype.startRecordIndex = 1;

/**
 * Maximum number of pagination page links to show. Any page links beyond this number are
 * available through the "&lt;" and "&gt;" links. A negative value will display all page links.
 *
 * @property pageLinksLength
 * @type Number
 * @default -1
 */
YAHOO.widget.DataTable.prototype.pageLinksLength = -1;

/**
 * Array of options to show in the rows-per-page pagination dropdown.
 *
 * @property rowsPerPageDropdown
 * @type Number[]
 */
YAHOO.widget.DataTable.prototype.rowsPerPageDropdown = null;
        
/**
 * First pagination page link.
 *
 * @property pageLinksStart
 * @type Number
 * @default 1
 */
YAHOO.widget.DataTable.prototype.pageLinksStart = 1;

/**
 * An array of DIV elements into which pagination elements can go.
 *
 * @property pagers
 * @type HTMLElement[]
 */
YAHOO.widget.DataTable.prototype.pagers = null;

/**
 * True if the DataTable is empty of data. False if DataTable is populated with
 * data from RecordSet.
 *
 * @property isEmpty
 * @type Boolean
 */
YAHOO.widget.DataTable.prototype.isEmpty = false;


/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Public accessor to the unique name of the DataSource instance.
 *
 * @method toString
 * @return {String} Unique name of the DataSource instance.
 */

YAHOO.widget.DataTable.prototype.toString = function() {
    return "DataTable " + this._sName;
};

/**
 * Returns element reference to given TD cell.
 *
 * @method getCell
 * @param row {Number} Row number.
 * @param col {Number} Column number.
 */
YAHOO.widget.DataTable.prototype.getCell = function(row, col) {
    return(this._elBody.rows[row].cells[col]);
};

/**
 * Returns element reference to given TR cell.
 *
 * @method getRow
 * @param index {Number} Row number.
 */
YAHOO.widget.DataTable.prototype.getRow = function(index) {
    return(this._elBody.rows[index]);
};

/**
 * Placeholder row to indicate table data is empty.
 *
 * @method showEmptyMessage
 */
YAHOO.widget.DataTable.prototype.showEmptyMessage = function() {
    if(this.isEmpty) {
        return;
    }
    if(this.isLoading) {
        this.hideTableMessages();
    }

    this._elMsgBody.style.display = "";
    var elCell = this._elMsgCell;
    elCell.className = YAHOO.widget.DataTable.CLASS_EMPTY;
    elCell.innerHTML = YAHOO.widget.DataTable.MSG_EMPTY;
    this.isEmpty = true;
};

/**
 * Placeholder row to indicate table data is loading.
 *
 * @method showLoadingMessage
 */
YAHOO.widget.DataTable.prototype.showLoadingMessage = function() {
    if(this.isLoading) {
        return;
    }
    if(this.isEmpty) {
        this.hideTableMessages();
    }

    this._elMsgBody.style.display = "";
    var elCell = this._elMsgCell;
    elCell.className = YAHOO.widget.DataTable.CLASS_LOADING;
    elCell.innerHTML = YAHOO.widget.DataTable.MSG_LOADING;
    this.isLoading = true;
};

/**
 * Hide any placeholder message row.
 *
 * @method hideTableMessages
 */
YAHOO.widget.DataTable.prototype.hideTableMessages = function() {
    if(!this.isEmpty && !this.isLoading) {
        return;
    }

    this._elMsgBody.style.display = "none";

    this.isEmpty = false;
    this.isLoading = false;
};

/**
 * Sets focus on the TABLE element.
 *
 * @method focusTable
 */
YAHOO.widget.DataTable.prototype.focusTable = function() {
    var elTable = this._elTable;
    if(!this._bFocused) {
        // http://developer.mozilla.org/en/docs/index.php?title=Key-navigable_custom_DHTML_widgets
        // The timeout is necessary in both IE and Firefox 1.5, to prevent scripts from doing
        // strange unexpected things as the user clicks on buttons and other controls.
        setTimeout(function() { elTable.focus(); },0);
        this._bFocused = true;
    }
};

/**
 * Add rows to bottom of table body.
 *
 * @method appendRow
 * @param aRecords {YAHOO.widget.Record[]} Array of Records.
 */
YAHOO.widget.DataTable.prototype.appendRows = function(aRecords) {
    if(aRecords && aRecords.length > 0) {
        this.hideTableMessages();

        for(var i=0; i<aRecords.length; i++) {
            this.addRow(aRecords[i]);
        }
    }
};

/**
 * Add rows to top of table body.
 *
 * @method insertRows
 * @param aRecords {YAHOO.widget.Record[]} Array of Records.
 */
YAHOO.widget.DataTable.prototype.insertRows = function(aRecords) {
    if(aRecords && aRecords.length > 0) {
        this.hideTableMessages();

        for(var i=0; i<aRecords.length; i++) {
            this.addRow(aRecords[i],0);
        }
    }
};

/**
 * Replaces existing rows of table body with new Records.
 *
 * @method replaceRows
 * @param aRecords {YAHOO.widget.Record[]} Array of Records.
 */
YAHOO.widget.DataTable.prototype.replaceRows = function(aRecords) {
    var i;
    
    if(aRecords && aRecords.length > 0) {
        this.hideTableMessages();

        var elBody = this._elBody;
        var elRows = this._elBody.rows;
        // Remove extra rows
        while(elBody.hasChildNodes() && (elRows.length > aRecords.length)) {
            elBody.deleteRow(0);
        }
        // Unselect rows in the UI but keep tracking selected rows
        var selectedRecords = this.getSelectedRecords();
        if(selectedRecords.length > 0) {
            this._unselectAllRows();
        }
        // Format in-place existing rows
        for(i=0; i<elRows.length; i++) {
            if(aRecords[i]) {
                var oRecord = aRecords[i];
                this.updateRow(oRecord,i);
            }
        }

        // Add rows as necessary
        for(i=elRows.length; i<aRecords.length; i++) {
            this.addRow(aRecords[i]);
        }
        
        // Select any rows as necessary
        for(i=0; i<selectedRecords.length; i++) {
            var allRows = elBody.rows;
            for(var j=0; j<allRows.length; j++) {
                if(selectedRecords[i] == allRows[j].recordId) {
                    this._select([allRows[j]]);
                }
            }
        }
    }
};

/**
 * Add a new row to table body at position i if given, or to the bottom otherwise.
 *
 * @method addRow
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param index {Number} Position at which to add row.
 */
YAHOO.widget.DataTable.prototype.addRow = function(oRecord, index) {
    if(oRecord) {
        this.hideTableMessages();

        // Is this an insert or an append?
        var insert = (isNaN(index)) ? false : true;
        if(!insert) {
            index = this._elBody.rows.length;
        }

        var oColumnSet = this._oColumnSet;
        var oRecordSet = this._oRecordSet;

        var elRow = (insert && this._elBody.rows[index]) ?
            this._elBody.insertBefore(document.createElement("tr"),this._elBody.rows[index]) :
            this._elBody.appendChild(document.createElement("tr"));
        var recId = oRecord.id;
        elRow.id = this.id+"-bdrow"+recId;
        elRow.recordId = recId;

        // Create TBODY cells
        for(var j=0; j<oColumnSet.keys.length; j++) {
            var oColumn = oColumnSet.keys[j];
            var elCell = elRow.appendChild(document.createElement("td"));
            elCell.id = this.id+"-bdrow"+index+"-cell"+j;
            elCell.headers = oColumn.id;
            elCell.columnIndex = j;
            elCell.headers = oColumnSet.headers[j];
            
            oColumn.format(elCell, oRecord);
            /*p.abx {word-wrap:break-word;}
    ought to solve the problem for Safari (the long words will wrap in your
    tds, instead of overflowing to the next td.
    (this is supported by IE win as well, so hide it if needed).

    One thing, though: it doesn't work in combination with
    'white-space:nowrap'.*/

    // need a div wrapper for safari?
            if(this.fixedWidth) {
                elCell.style.overflow = "hidden";
                //elCell.style.width = "20px";
            }
        }

        if(this.isEmpty && (this._elBody.rows.length > 0)) {
            //TODO: hideMessages()
            //this._initRows()
            //this.isEmpty = false;
        }

        // Striping
        if(!insert) {
            if(index%2) {
                YAHOO.util.Dom.addClass(elRow, YAHOO.widget.DataTable.CLASS_ODD);
            }
            else {
                YAHOO.util.Dom.addClass(elRow, YAHOO.widget.DataTable.CLASS_EVEN);
            }
        }
        else {
            //TODO: pass in a subset for better performance
            this._restripeRows();
        }
    }
};

/**
 * Updates existing row at position i with data from the given Record.
 *
 * @method updateRow
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param index {Number} Position at which to update row.
 */
YAHOO.widget.DataTable.prototype.updateRow = function(oRecord, index) {
    if(oRecord) {
        this.hideTableMessages();

        var elRow = this._elBody.rows[index];
        elRow.recordId = oRecord.id;

        var columns = this._oColumnSet.keys;
        // ...Update TBODY cells with new data
        for(var j=0; j<columns.length; j++) {
            columns[j].format(elRow.cells[j], oRecord);
        }
    }
};

/**
 * Calls delete on selected rows.
 *
 * @method deleteSelectedRows
 */
YAHOO.widget.DataTable.prototype.deleteRows = function(rows) {
    for(var i=0; i<rows.length; i++) {
        this.deleteRow(rows[i]);
    }
};

/**
 * Deletes a given row element as well its corresponding Record in the RecordSet.
 *
 * @method deleteRow
 * @param elRow {element} HTML table row element reference.
 */
YAHOO.widget.DataTable.prototype.deleteRow = function(elRow) {
    if(elRow) {
        var allRows = this._elBody.rows;
        var id = elRow.id;
        var recordId = elRow.recordId;
        for(var i=0; i< allRows.length; i++) {
            if(id == allRows[i].id) {
                this._elBody.deleteRow(i);

                // Update the RecordSet
                this._oRecordSet.deleteRecord(i);
                break;
            }
        }
        if(this._elBody.rows.length === 0) {
            this.showEmptyMessage();
        }
        this.fireEvent("rowDeleteEvent",{rowIndex: i, rowId: id, recordId: recordId});
    }
};


/**
 * Sets one or more rows to the selected state.
 *
 * @method select
 * @param aRows {HTMLElement | String | HTMLElement[] | String[]} HTML TR element
 * reference, TR String ID, array of HTML TR element, or array of TR element IDs.
 */
YAHOO.widget.DataTable.prototype.select = function(els) {
    if(els) {
        if(els.constructor != Array) {
            els = [els];
        }
        this._select(els);
        // Add Record ID to internal tracker
        var tracker = this._aSelectedRecords;
        for(var i=0; i<els.length; i++) {
            var id = els[i].recordId;
            // Remove if already there
            if(tracker.indexOf(id) >  0) {
                tracker.splice(indexOf(id),1);
            }
            // Add to the end
            tracker.push(id);
        }
        this.fireEvent("selectEvent",{els:els});
    }
};

/**
 * Sets one or more rows to the unselected state.
 *
 * @method unselect
 * @param aRows {HTMLElement | String | HTMLElement[] | String[]} HTML element
 * reference, element ID, array of HTML elements, or array of element IDs
 */
YAHOO.widget.DataTable.prototype.unselect = function(els) {
    if(els) {
        if(els.constructor != Array) {
            els = [els];
        }
        this._unselect(els);
        // Remove Record ID from internal tracker
        var tracker = this._aSelectedRecords;
        for(var i=0; i<els.length; i++) {
            var index = tracker.indexOf(els[i].recordId);
            if(index >  -1) {
                tracker.splice(index,1);
            }
        }
        this.fireEvent("unselectEvent",{els:els});
    }
};

/**
 * Unselects all selected rows.
 *
 * @method unselectAllRows
 */
YAHOO.widget.DataTable.prototype.unselectAllRows = function() {
    var selectedRows = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"tr",this._elBody);
    this.unselect(selectedRows);
};

/**
 * Unselects all selected cells.
 *
 * @method unselectAllCells
 */
YAHOO.widget.DataTable.prototype.unselectAllCells = function() {
    var selectedCells = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"td",this._elBody);
    this.unselect(selectedCells);
};


/**
 * Returns true if given element is select, false otherwise.
 *
 * @method isSelected
 * @param el {element} HTML element reference.
 * @return {boolean} True if element is selected.
 */
YAHOO.widget.DataTable.prototype.isSelected = function(el) {
    return YAHOO.util.Dom.hasClass(el,YAHOO.widget.DataTable.CLASS_SELECTED);
};

/**
 * Returns array of selected Record IDs.
 *
 * @method getSelectedRecords
 * @return {HTMLElement[]} Array of selected TR elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedRecords = function() {
    return this._aSelectedRecords;
};

/**
 * Returns array of selected rows.
 *
 * @method getSelectedRows
 * @return {HTMLElement[]} Array of selected TR elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedRows = function() {
    //TODO: keep internal array if this is non performant
    return YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"tr",this._elBody);
};

/**
 * Returns array of selected TD cells.
 *
 * @method getSelectedCells
 * @return {HTMLElement[]} Array of selected TD elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedCells = function() {
    //TODO: keep internal array
    return YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"td",this._elBody);
};

/**
 * Returns pointer to the DataTable instance's ColumnSet instance.
 *
 * @method getColumnSet
 * @return {YAHOO.widget.ColumnSet} ColumnSet instance.
 */
YAHOO.widget.DataTable.prototype.getColumnSet = function() {
    return this._oColumnSet;
};

/**
 * Returns pointer to the DataTable instance's RecordSet instance.
 *
 * @method getRecordSet
 * @return {YAHOO.widget.RecordSet} RecordSet instance.
 */
YAHOO.widget.DataTable.prototype.getRecordSet = function() {
    return this._oRecordSet;
};

/**
 * Handles tableKeypressEvent.
 *
 * @method doKeypress
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.doKeypress = function(oArgs) {
    //TODO: hook this up
    var key = YAHOO.util.Event.getCharCode(oArgs.event);
    switch (key) {
        case 46: // delete
            this.deleteSelectedRows();
            break;
    }
};

/**
 * Displays a specific page of a paginated DataTable.
 *
 * @method showPage
 * @param nPage {Number} Which page.
 */
YAHOO.widget.DataTable.prototype.showPage = function(nPage) {
//TODO: much optimization
    // Validate new page number
    if(isNaN(nPage) || (nPage < 1) || (nPage > this._totalPages)) {
        nPage = 1;
    }
    /*if(nPage < this.pageLinksStart){
        this.pageLinksStart = nPage;
    }
    else if (nPage >= (this.pageLinksStart + this.pageLinksLength)) {
        this.pageLinksStart = nPage - this.pageLinksLength + 1;
    }
    var rowsPerPage = this.rowsPerPage;
    this.startRecordIndex = (nPage-1) * rowsPerPage;
    var startRecordIndex = this.startRecordIndex;
    var pageRecords = this._oRecordSet.getRecords(startRecordIndex, rowsPerPage);*/
    this.pageCurrent = nPage;
    this.paginate();
};

/**
 * Renders paginator with current values.
 *
 * @method paginate
 */
YAHOO.widget.DataTable.prototype.paginate = function() {
    var i;
    
    // How many total Records
    var recordsLength = this._oRecordSet.getLength();
    
    // How many rows this page
    var maxRows = (this.rowsPerPage < recordsLength) ?
            this.rowsPerPage : recordsLength;

    // How many total pages
    this._totalPages = Math.ceil(recordsLength / maxRows);

    // First row of this page
    this.startRecordIndex = (this.pageCurrent-1) * this.rowsPerPage;

    // How many page links to display
    var pageLinksLength =
            ((this.pageLinksLength > 0) && (this.pageLinksLength < this._totalPages)) ?
            this.pageLinksLength : this._totalPages;

    // First link of this page
    this.pageLinksStart = (Math.ceil(this.pageCurrent/pageLinksLength-1) * pageLinksLength) + 1;

    // Show Records for this page
    var pageRecords = this._oRecordSet.getRecords(this.startRecordIndex, this.rowsPerPage);
    this.replaceRows(pageRecords);

    if(this.rowsPerPage < recordsLength) {
        // Markup for page links
        var isFirstPage = (this.pageCurrent == 1) ? true : false;
        var isLastPage = (this.pageCurrent == this._totalPages) ? true : false;
        var firstPageLink = (isFirstPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_FIRSTPAGE + "\">&lt;&lt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_FIRSTLINK + "\">&lt;&lt;</a> ";
        var prevPageLink = (isFirstPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_PREVPAGE + "\">&lt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_PREVLINK + "\">&lt;</a> " ;
        var nextPageLink = (isLastPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_NEXTPAGE + "\">&gt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_NEXTLINK + "\">&gt;</a> " ;
        var lastPageLink = (isLastPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_LASTPAGE + "\">&gt;&gt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_LASTLINK + "\">&gt;&gt;</a> ";
        var markup = firstPageLink + prevPageLink;
        var maxLinks = (this.pageLinksStart+pageLinksLength < this._totalPages) ?
            this.pageLinksStart+pageLinksLength-1 : this._totalPages;
        for(i=this.pageLinksStart; i<=maxLinks; i++) {
             if(i != this.pageCurrent) {
                markup += " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_PAGELINK + "\">" + i + "</a> ";
            }
            else {
                markup += " <span class=\"" + YAHOO.widget.DataTable.CLASS_CURRENTPAGE + "\">" + i + "</span>";
            }
        }
        markup += nextPageLink + lastPageLink;

        // Markup for rows-per-page dropdown
        if(this.rowsPerPageDropdown && (this.rowsPerPageDropdown.constructor == Array)) {
            var select1 = document.createElement("select");
            select1.className = YAHOO.widget.DataTable.CLASS_PAGESELECT;
            var select2 = document.createElement("select");
            select2.className = YAHOO.widget.DataTable.CLASS_PAGESELECT;
            
            for(i=0; i<this.rowsPerPageDropdown.length; i++) {
                var option1 = document.createElement("option");
                var option2 = document.createElement("option");
                option1.value = this.rowsPerPageDropdown[i];
                option2.value = this.rowsPerPageDropdown[i];
                option1.innerHTML = this.rowsPerPageDropdown[i];
                option2.innerHTML = this.rowsPerPageDropdown[i];

                if(this.rowsPerPage === this.rowsPerPageDropdown[i]) {
                    option1.selected = true;
                    option2.selected = true;
                }
                option1 = select1.appendChild(option1);
                option2 = select2.appendChild(option2);
            }
        }

        // Populate each pager container with markup
        if(!this.pagers || (this.pagers.length == 0)) {
            var pager1 = document.createElement("span");
            pager1.className = YAHOO.widget.DataTable.CLASS_PAGELINKS;
            
            var pager2 = document.createElement("span");
            pager2.className = YAHOO.widget.DataTable.CLASS_PAGELINKS;

            pager1 = this._elContainer.insertBefore(pager1, this._elTable);
            select1 = this._elContainer.insertBefore(select1, this._elTable);
            select2 = this._elContainer.insertBefore(select2, this._elTable.nextSibling);
            pager2 = this._elContainer.insertBefore(pager2, this._elTable.nextSibling);
            this.pagers = [
                {links:pager1,select:select1},
                {links:pager2,select:select2}
            ];
        }
        
        this.pagers[0].links.innerHTML = markup;
        this.pagers[1].links.innerHTML = markup;

        for(i=0; i<this.pagers.length; i++) {
            YAHOO.util.Event.purgeElement(this.pagers[i].links);
            YAHOO.util.Event.purgeElement(this.pagers[i].select);
            this.pagers[i].innerHTML = markup;
            YAHOO.util.Event.addListener(this.pagers[i].links,"click",this._onPagerClick,this);
            YAHOO.util.Event.addListener(this.pagers[i].select,"change",this._onPagerSelect,this);
        }
    }
};

/**
 * Sort given column.
 *
 * @method sortColumn
 * @param oColumn {YAHOO.widget.Column} Column to sort. TODO: accept the TH or TH.key
 */
YAHOO.widget.DataTable.prototype.sortColumn = function(oColumn) {
    if(!oColumn) {
        return;
    }
    if(!oColumn instanceof YAHOO.widget.Column) {
        //TODO: Figure out the column based on TH ref or TH.key
        return;
    }
    if(oColumn.sortable) {
        // What is the default sort direction?
        var sortDir = (oColumn.sortOptions && oColumn.sortOptions.defaultOrder) ? oColumn.sortOptions.defaultOrder : "asc";

        //TODO: what if column doesn't have key?
        // Is the column sorted already?
        if(oColumn.key && (this.sortedBy == oColumn.key)) {
            if(this.sortedByDir) {
                sortDir = (this.sortedByDir == "asc") ? "desc" : "asc";
            }
            else {
                sortDir = (sortDir == "asc") ? "desc" : "asc";
            }
        }

        // Define the sort handler function based on the direction
        var sortFnc = null;
        if((sortDir == "desc") && oColumn.sortOptions && oColumn.sortOptions.descHandler) {
            sortFnc = oColumn.sortOptions.descHandler
        }
        else if((sortDir == "asc") && oColumn.sortOptions && oColumn.sortOptions.ascHandler) {
            sortFnc = oColumn.sortOptions.ascHandler
        }

        // One was not provided so use the built-in sort handler functions
        // ONLY IF column key is defined
        // TODO: use diff default functions based on column data type
        // TODO: nested/cumulative/hierarchical sorting
        // TODO: support server side sorting
        if(!sortFnc && oColumn.key) {
            sortFnc = function(a, b) {
                if(sortDir == "desc") {
                    var sorted = YAHOO.util.Sort.compareDesc(a[oColumn.key],b[oColumn.key]);
                    if(sorted == 0) {
                        return YAHOO.util.Sort.compareDesc(a.id,b.id);
                    }
                    else {
                        return sorted;
                    }
                }
                else {
                    var sorted = YAHOO.util.Sort.compareAsc(a[oColumn.key],b[oColumn.key]);
                    if(sorted == 0) {
                        return YAHOO.util.Sort.compareAsc(a.id,b.id);
                    }
                    else {
                        return sorted;
                    }
                }
            };
        }

        if(sortFnc) {
            // Do the actual sort
            this._oRecordSet.sort(sortFnc);
            // Update the UI
            this.paginate();

            // Keep track of currently sorted column
            YAHOO.util.Dom.removeClass(this.sortedBy,YAHOO.widget.DataTable.CLASS_SORTEDBYASC);
            YAHOO.util.Dom.removeClass(this.sortedBy,YAHOO.widget.DataTable.CLASS_SORTEDBYDESC);
            this.sortedBy = oColumn.key;
            this.sortedByDir = sortDir;
            var newClass = (sortDir == "asc") ? YAHOO.widget.DataTable.CLASS_SORTEDBYASC : YAHOO.widget.DataTable.CLASS_SORTEDBYDESC;
            YAHOO.util.Dom.addClass(oColumn.getId(), newClass);
            YAHOO.log("Column \"" + oColumn.key + "\" sorted " + sortDir,"info",this.toString());
        }
    }
    else {
        //TODO
        YAHOO.log("Column \"" + oColumn + "\" not sortable", "info", this.toString());
    }
};

/**
 * Shows editor for given cell.
 *
 * @method editCell
 */
YAHOO.widget.DataTable.prototype.editCell = function(elCell) {
    if(elCell && !isNaN(elCell.columnIndex)) {
        var column = this._oColumnSet.keys[elCell.columnIndex];
        if(column && column.editor) {
            this.activeEditor = column.getEditor(elCell,this._oRecordSet.getRecord(elCell.parentNode.recordId));
        }
        this._bFocused = true;
    }
};

/**
 * Formats given cell.
 *
 * @method formatCell
 */
YAHOO.widget.DataTable.prototype.formatCell = function(elCell) {
    if(elCell && !isNaN(elCell.columnIndex)) {
        var column = this._oColumnSet.keys[elCell.columnIndex];
        column.format(elCell,this._oRecordSet.getRecord(elCell.parentNode.recordId));
    }
};


/////////////////////////////////////////////////////////////////////////////
//
// Public Custom Event Handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Overridable custom event handler to sort column.
 *
 * @method onEventSortColumn
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSortColumn = function(oArgs) {
    var evt = oArgs.event;
    var target = oArgs.target;
    YAHOO.util.Event.stopEvent(evt);
    
    //TODO: traverse DOM to find a columnIndex, incl safety net if none exists
    var columnIndex = target.columnIndex;
    if(!isNaN(columnIndex)) {
        this.sortColumn(this._oColumnSet.keys[columnIndex]);
    }
};

/**
 * Overridable custom event handler to select row.
 *
 * @method onEventSelectRow
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSelectRow = function(oArgs) {
    var i;
    var evt = oArgs.event;
    var target = oArgs.target;

    //TODO: add a safety net in case TR is never reached
    // Walk up the DOM until we get to the TR
    while(target.nodeName.toLowerCase() != "tr") {
        target = target.parentNode;
    }

    if(this.isSelected(target)) {
        this.unselect(target);
    }
    else {
        if(this.singleSelect && !evt.ctrlKey && !evt.shiftKey) {
            this.unselectAllRows();
        }
        if(evt.shiftKey) {
            var startRow = this._lastSelected;
            if(startRow && this.isSelected(startRow)) {
                this.unselectAllRows();
                if(startRow.sectionRowIndex < target.sectionRowIndex) {
                    for(i=startRow.sectionRowIndex; i<=target.sectionRowIndex; i++) {
                        this._select(this._elBody.rows[i]);
                    }
                }
                else {
                    for(i=target.sectionRowIndex; i<=startRow.sectionRowIndex; i++) {
                        this._select(this._elBody.rows[i]);
                    }
                }
            }
            else {
                this._select(target);
            }
        }
        else {
            this.select(target);
        }
    }
};

/**
 * Overridable custom event handler to select cell.
 *
 * @method onEventSelectCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSelectCell = function(oArgs) {
    var evt = oArgs.event;
    var target = oArgs.target;

    //TODO: add a safety net in case TD is never reached
    // Walk up the DOM until we get to the TD
    while(target.nodeName.toLowerCase() != "td") {
        target = target.parentNode;
    }

    if(this.isSelected(target)) {
        this.unselect(target);
    }
    else {
        if(this.singleSelect && !evt.ctrlKey) {
            this.unselectAllCells();
        }
        this.select(target);
    }
};

/**
 * Overridable custom event handler to format cell.
 *
 * @method onEventFormatCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventFormatCell = function(oArgs) {
    var evt = oArgs.event;
    var element = oArgs.target;

    //TODO: add a safety net in case TD is never reached
    // Walk up the DOM until we get to the TD
    while(element.nodeName.toLowerCase() != "td") {
        element = element.parentNode;
    }

    this.formatCell(element);
};

/**
 * Overridable custom event handler to edit cell.
 *
 * @method onEventEditCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventEditCell = function(oArgs) {
    var evt = oArgs.event;
    var element = oArgs.target;

    //TODO: add a safety net in case TD is never reached
    // Walk up the DOM until we get to the TD
    while(element.nodeName.toLowerCase() != "td") {
        element = element.parentNode;
    }

    this.editCell(element);
};

/**
 * Handles data return for adding new rows to table, including updating pagination.
 *
 * @method onDataReturnPaginate
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 */
YAHOO.widget.DataTable.prototype.onDataReturnPaginate = function(sRequest, oResponse) {
    // Update the RecordSet from the response
    var newRecords = this._oRecordSet.append(oResponse);
    if(newRecords) {
        // Update markup
        //this.appendRows(newRecords);
        this.paginate();
        YAHOO.log("Data returned for " + newRecords.length + " rows","info",this.toString());
    }
};

/**
 * Handles data return for adding new rows to bottom of table.
 *
 * @method onDataReturnAppendRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 */
YAHOO.widget.DataTable.prototype.onDataReturnAppendRows = function(sRequest, oResponse) {
    // Update the RecordSet from the response
    var newRecords = this._oRecordSet.append(oResponse);
    if(newRecords) {
        // Update markup
        this.appendRows(newRecords);
        YAHOO.log("Data returned for " + newRecords.length + " rows","info",this.toString());
    }
};

/**
 * Handles data return for inserting new rows to top of table.
 *
 * @method onDataReturnInsertRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 */
YAHOO.widget.DataTable.prototype.onDataReturnInsertRows = function(sRequest, oResponse) {
    // Update the RecordSet from the response
    var newRecords = this._oRecordSet.insert(oResponse);
    if(newRecords) {
        // Update markup
        this.insertRows(newRecords);
        YAHOO.log("Data returned for " + newRecords.length + " rows","info",this.toString());
    }
};

/**
 * Handles data return for replacing all existing of table with new rows.
 *
 * @method onDataReturnReplaceRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 */
YAHOO.widget.DataTable.prototype.onDataReturnReplaceRows = function(sRequest, oResponse) {
    // Update the RecordSet from the response
    var newRecords = this._oRecordSet.replace(oResponse);
    if(newRecords) {
        this.replaceRows(newRecords);
        YAHOO.log("Data returned for " + newRecords.length + " rows","info",this.toString());
    }
};


/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * The ColumnSet class defines and manages a DataTable's Columns,
 * including nested hierarchies and access to individual Column instances.
 *
 * @class ColumnSet
 * @constructor
 * @param aHeaders {Object[]} Array of object literals that define header cells.
 */
YAHOO.widget.ColumnSet = function(aHeaders) {
//TODO: break out nested functions into private methods
    this._sName = "instance" + YAHOO.widget.ColumnSet._nCount;

    // Top-down tree representation of all Columns
    var tree = [];
    // Flat representation of all Columns
    var flat = [];
    // Flat representation of only Columns that display data
    var keys = [];
    // ID index of nested parent heirarchies for HEADERS attribute
    var headers = [];

    var nodelevel = -1;

    // Internal recursive function to parse columns
    var parseColumns = function(nodeList, parent) {
        nodelevel++;
        // A node level is an array of Columns
        if(!tree[nodelevel]) {
            tree[nodelevel] = [];
        }

        // Determine depth of descendants at this level for node's rowspan
        var nodeLevelMaxChildren = 0;
        var recurseChildren = function(nodeList) {
            var tmpMax = 0;
            for(var i=0; i<nodeList.length; i++) {
                if(nodeList[i].children) {
                    tmpMax++;
                    recurseChildren(nodeList[i].children);
                }
                if(tmpMax > nodeLevelMaxChildren) {
                    nodeLevelMaxChildren = tmpMax;
                }
            }
        }
        recurseChildren(nodeList);

        // Parse each node for attributes and any children
        for(var j=0; j<nodeList.length; j++) {
            // Instantiate a Column for each node
            var oColumn = new YAHOO.widget.Column(nodeList[j]);
            flat.push(oColumn);
            
            // Assign parent, if applicable
            if(parent) {
                oColumn._parent = parent;
            }

            // Start with default values
            oColumn._rowspan = 1;
            oColumn._colspan = 1;

            // Column may have children
            if(nodeList[j].children) {
                var children = nodeList[j].children;
                var length = children.length;
                
                // Cascade certain properties to children if not defined on their own
                for(var k=0; k<length; k++) {
                    var child = children[k];
                    if(oColumn.className && (child.className === undefined)) {
                        child.className = oColumn.className;
                    }
                    if(oColumn.editor && (child.editor === undefined)) {
                        child.editor = oColumn.editor;
                    }
                    if(oColumn.formatter && (child.formatter === undefined)) {
                        child.formatter = oColumn.formatter;
                    }
                    if(oColumn.resizeable && (child.resizeable === undefined)) {
                        child.resizeable = oColumn.resizeable;
                    }
                    if(oColumn.type && (child.type === undefined)) {
                        child.type = oColumn.type;
                    }
                    if(oColumn.width && (child.width === undefined)) {
                        child.width = oColumn.width;
                    }
                }
                
                // Children increase colspan of the Column
                oColumn._colspan = length;

                // Children increase colspan of the Column's parent
                if (parent && parent._colspan) {
                    parent._colspan += length-1;
                    parent._children.push(oColumn);
                }
                
                // Children must also be parsed
                if(!tree[nodelevel+1]) {
                    tree[nodelevel+1] = [];
                }
               parseColumns(children, oColumn);
            }
            
            // This Column does not have children,
            // but other Columns at this level do
            else if(nodeLevelMaxChildren > 0) {
                // Children of siblings increase the rowspan of the Column
                oColumn._rowspan += nodeLevelMaxChildren;
                //if(oColumn.key) {
                    oColumn._index = keys.length;
                    keys.push(oColumn);
                //}
            }
            // This entire node level does not have any children
            else {
                //if(oColumn.key) {
                    oColumn._index = keys.length;
                    keys.push(oColumn);
                //}
            }

            // Add the Column to the top-down tree
            tree[nodelevel].push(oColumn);
        }
        nodelevel--;
    };

    // Do the parsing
    if(aHeaders.length > 0) {
        parseColumns(aHeaders);
    }

    // Store header nesting in an array
    var recurseAncestors = function(i, oColumn) {
        headers[i].push(oColumn._id);
        if(oColumn._parent) {
            recurseAncestors(i, oColumn._parent);
        }
    };
    for(var i=0; i<keys.length; i++) {
        headers[i] = [];
        recurseAncestors(i, keys[i]);
        headers[i] = headers[i].reverse();
        headers[i] = headers[i].join(" ");
    }

    this.tree = tree;
    this.flat = flat;
    this.keys = keys;
    this.headers = headers;
    
    YAHOO.widget.ColumnSet._nCount++;
    YAHOO.log("ColumnSet initialized", "info", this.toString());
};

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal class variable to index multiple data table instances.
 *
 * @property _nCount
 * @type number
 * @private
 * @static
 */
YAHOO.widget.ColumnSet._nCount = 0;

/**
 * Unique instance name.
 *
 * @property _sName
 * @type String
 * @private
 */
YAHOO.widget.ColumnSet.prototype._sName = null;

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Top-down tree representation of Column hierarchy.
 *
 * @property tree
 * @type YAHOO.widget.Column[]
 * @default []
 */
YAHOO.widget.ColumnSet.prototype.tree = [];

/**
 * Flattened representation of all Columns.
 *
 * @property flat
 * @type YAHOO.widget.Column[]
 * @default []
 */
YAHOO.widget.ColumnSet.prototype.flat = [];

/**
 * Array of Columns that map one-to-one to a table column.
 *
 * @property keys
 * @type YAHOO.widget.Column[]
 * @default []
 */
YAHOO.widget.ColumnSet.prototype.keys = [];

/**
 * ID index of nested parent heirarchies for HEADERS accessibility attribute.
 *
 * @property headers
 * @type String[]
 * @default []
 */
YAHOO.widget.ColumnSet.prototype.headers = [];

/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Public accessor to the unique name of the ColumnSet instance.
 *
 * @method toString
 * @return {String} Unique name of the ColumnSet instance.
 */

YAHOO.widget.ColumnSet.prototype.toString = function() {
    return "ColumnSet " + this._sName;
};

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * The Column class defines and manages attributes of DataTable Columns
 *
 *
 * @class Column
 * @constructor
 * @param oConfigs {Object} Object literal of configuration values.
 */
YAHOO.widget.Column = function(oConfigs) {
    // Internal variables
    this._id = "yui-dtcol"+YAHOO.widget.Column._nCount;
    
    // Object literal defines Column attributes
    if(typeof oConfigs == "object") {
        for(var sConfig in oConfigs) {
            if(sConfig) {
                this[sConfig] = oConfigs[sConfig];
            }
        }
    }
    
    YAHOO.widget.Column._nCount++;
};

/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal instance counter.
 *
 * @property _nCount
 * @type Number
 * @static
 * @default 0
 */
YAHOO.widget.Column._nCount = 0;


/**
 * Unique ID, also assigned as DOM ID.
 *
 * @property _id
 * @type String
 * @private
 */
YAHOO.widget.Column.prototype._id = null;

/**
 * Reference to Column's index within its ColumnSet's key array, or null if not applicable.
 *
 * @property _index
 * @type Number
 * @private
 */
YAHOO.widget.Column.prototype._index = null;

/**
 * Number of table cells the Column spans.
 *
 * @property _colspan
 * @type Number
 * @private
 */
YAHOO.widget.Column.prototype._colspan = 1;

/**
 * Number of table rows the Column spans.
 *
 * @property _rowspan
 * @type Number
 * @private
 */
YAHOO.widget.Column.prototype._rowspan = 1;

/**
 * Column's parent, or null.
 *
 * @property _parent
 * @type YAHOO.widget.Column
 * @private
 */
YAHOO.widget.Column.prototype._parent = null;

/**
 * Array of Column's chilren, or null.
 *
 * @property _children
 * @type YAHOO.widget.Column[]
 * @private
 */
YAHOO.widget.Column.prototype._children = [];

//TODO: clean these up

/**
 * Current offsetWidth of the column (in pixels).
 *
 * @property _width
 * @type Number
 * @private
 */
YAHOO.widget.Column.prototype._width = null;

/**
 * Minimum width the column can support (in pixels). Value is populated only if table
 * is fixedwidth, null otherwise.
 *
 * @property _minWidth
 * @type Number
 * @private
 */
YAHOO.widget.Column.prototype._minWidth = null;

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Associated database column, or null.
 *
 * @property key
 * @type String
 */
YAHOO.widget.Column.prototype.key = null;

/**
 * Text or HTML for display in the column head cell.
 *
 * @property text
 * @type String
 */
YAHOO.widget.Column.prototype.text = null;

/**
 * Data types: "string", "number", "date", "currency", "checkbox", "select",
 * "email", "link".
 *
 * @property type
 * @type String
 * @default "string"
 */
YAHOO.widget.Column.prototype.type = "string";

/**
 * Column head cell ABBR for accessibility.
 *
 * @property abbr
 * @type String
 */
YAHOO.widget.Column.prototype.abbr = null;

/**
 * Array of object literals that define children of a column header.
 *
 * @property children
 * @type Object[]
 */
YAHOO.widget.Column.prototype.children = null;

/**
 * Column width.
 *
 * @property width
 * @type String
 */
YAHOO.widget.Column.prototype.width = null;

/**
 * Custom CSS class to be applied to every cell in the Column.
 *
 * @property className
 * @type String
 */
YAHOO.widget.Column.prototype.className = null;

/**
 * Defines a custom format function for Column, otherwise default is used.
 *
 * @property formatter
 * @type HTMLFunction
 */
YAHOO.widget.Column.prototype.formatter = null;

/**
 * Defines the type of editor for Column, otherwise Column is not editable.
 *
 * @property editor
 * @type String
 */
YAHOO.widget.Column.prototype.editor = null;

/**
 * True if column is resizeable, false otherwise.
 *
 * @property resizeable
 * @type Boolean
 * @default false
 */
YAHOO.widget.Column.prototype.resizeable = false;

/**
 * True if column is sortable, false otherwise.
 *
 * @property sortable
 * @type Boolean
 * @default false
 */
YAHOO.widget.Column.prototype.sortable = false;

/**
 * True if column is currently sorted in ascending order.
 *
 * @property currentlyAsc
 * @type Boolean
 * @default null
 */
YAHOO.widget.Column.prototype.currentlyAsc = null;

/**
 * True if unsorted column should get arranged in descending order, (i.e., dates that
 * by default should get sorted in reverse chronological order).
 *
 * @property sortDesc
 * @type Boolean
 * @default false
 */
YAHOO.widget.Column.prototype.sortDesc = false;

/**
 * Custom sort handler to arrange column in descending order.
 *
 * @property sortDescHandler
 * @type Function
 * @default null
 */
YAHOO.widget.Column.prototype.sortDescHandler = null;

/**
 * Custom sort handler to arrange column in ascending order.
 *
 * @property sortAscHandler
 * @type Function
 * @default null
 */
YAHOO.widget.Column.prototype.sortAscHandler = null;















/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Public accessor returns Column's ID string.
 *
 * @method getId
 * @return {String} Column's ID string.
 */
YAHOO.widget.Column.prototype.getId = function() {
    return this._id;
};

/**
 * Public accessor returns Column's colspan number.
 *
 * @method getColSpan
 * @return {Number} Column's colspan number.
 */
YAHOO.widget.Column.prototype.getColSpan = function() {
    return this._colspan;
};

/**
 * Public accessor returns Column's rowspan number.
 *
 * @method getRowSpan
 * @return {Number} Column's rowspan number.
 */
YAHOO.widget.Column.prototype.getRowSpan = function() {
    return this._rowspan;
};


/**
 * Outputs markup into the given TD based on given Record.
 *
 * @method format
 * @param elCell {HTMLElement} TD to format for display.
 * @param oRecord {YAHOO.widget.Record} Record that holds data for the row.
 * @return {HTML} Markup.
 */
YAHOO.widget.Column.prototype.format = function(elCell,oRecord) {
    var oData = (this.key) ? oRecord[this.key] : null;
    if(this.formatter) {
        this.formatter(elCell, this, oRecord, oData);
    }
    else {
        var type = this.type;
        var markup = "";
        var classname = "";
        switch(type) {
            case "checkbox":
                YAHOO.widget.Column.formatCheckbox(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_CHECKBOX;
                break;
            case "currency":
                YAHOO.widget.Column.formatCurrency(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_CURRENCY;
                break;
            case "date":
                YAHOO.widget.Column.formatDate(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_DATE;
                break;
            case "email":
                YAHOO.widget.Column.formatEmail(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_EMAIL;
                break;
            case "link":
                YAHOO.widget.Column.formatLink(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_LINK;
                break;
            case "number":
                YAHOO.widget.Column.formatNumber(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_NUMBER;
                break;
            case "select":
                YAHOO.widget.Column.formatSelect(elCell, this, oRecord, oData);
                classname = YAHOO.widget.DataTable.CLASS_SELECT;
                break;
           default:
                elCell.innerHTML = (oData) ? oData.toString() : "";
                //elCell.innerHTML = (oData) ? "<a href=\"#\">"+oData.toString()+"</a>" : "";
                classname = YAHOO.widget.DataTable.CLASS_STRING;
                break;
        }

        YAHOO.util.Dom.addClass(elCell, classname);
        if(this.className) {
            YAHOO.util.Dom.addClass(elCell, this.className)
        }
    }
    
    if(this.editor) {
        YAHOO.util.Dom.addClass(elCell,YAHOO.widget.DataTable.CLASS_EDITABLE);
    }
};


/**
 * Formats cells in Columns of type "checkbox".
 *
 * @method formatCheckbox
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatCheckbox = function(elCell, oColumn, oRecord, oData) {
    var bChecked = oData;
    bChecked = (bChecked) ? " checked" : "";
    elCell.innerHTML = "<input type=\"checkbox\"" + bChecked +
            " class=\"" + YAHOO.widget.DataTable.CLASS_CHECKBOX + "\">";
};

/**
 * Formats cells in Columns of type "currency". Can be overridden for custom formatting.
 *
 * @method formatCurrency
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatCurrency = function(elCell, oColumn, oRecord, oData) {
    // Make it dollars
    var nAmount = oData;
    var markup;
        if(nAmount) {
             markup = "$"+nAmount;

            // Normalize to the penny
            var dotIndex = markup.indexOf(".")
            if(dotIndex < 0) {
                markup += ".00";
            }
            else {
                while(dotIndex != markup.length-3) {
                    markup += "0";
                }
            }
        }
        else {
            markup = "";
        }
        elCell.innerHTML = markup;
};

/**
 * Formats cells in Columns of type "date".
 *
 * @method formatDate
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatDate = function(elCell, oColumn, oRecord, oData) {
    var oDate = oData;
    if(oDate) {
        elCell.innerHTML = oDate.getMonth() + "/" + oDate.getDate()  + "/" + oDate.getFullYear();
    }
    else {
        elCell.innerHTML = "";
    }
};

/**
 * Formats cells in Columns of type "email".
 *
 * @method formatEmail
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatEmail = function(elCell, oColumn, oRecord, oData) {
    var sEmail = oData;
    if(sEmail) {
        elCell.innerHTML = "<a href=\"mailto:" + sEmail + "\">" + sEmail + "</a>";
    }
    else {
        elCell.innerHTML = "";
    }
};

/**
 * Formats cells in Columns of type "link".
 *
 * @method formatLink
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatLink = function(elCell, oColumn, oRecord, oData) {
    var sLink = oData;
    if(sLink) {
        elCell.innerHTML = "<a href=\"" + sLink + "\">" + sLink + "</a>";
    }
    else {
        elCell.innerHTML = "";
    }
};

/**
 * Formats cells in Columns of type "number".
 *
 * @method formatNumber
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatNumber = function(elCell, oColumn, oRecord, oData) {
    var nNumber = oData;
    if(nNumber) {
        elCell.innerHTML = nNumber.toString();
    }
    else {
        elCell.innerHTML = "";
    }
};

/**
 * Formats cells in Columns of type "select".
 *
 * @method formatSelect
 * @param elCell {HTMLElement} Table cell element.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.Column.formatSelect = function(elCell, oColumn, oRecord, oData) {
    var selectedValue = oData;
    var options = oColumn.selectOptions;

    var markup = "<select>";
    if(options) {
        for(var i=0; i<options.length; i++) {
            var option = options[i];
            markup += "<option value=\"" + option + "\"";
            if(selectedValue === option) {
                markup += " selected";
            }
            markup += ">" + option + "</option>";
        }
    }
    else {
        if(selectedValue) {
            markup += "<option value=\"" + selectedValue + "\" selected>" + selectedValue + "</option>";
        }
    }
    markup += "</select>";
    elCell.innerHTML = markup;
};






//TODO: clean these up



/**
 * Takes innerHTML from TD and parses out data for storage in RecordSet.
 *
 * @method parse
 * @param sMarkup {String} The TD's innerHTML value.
 * @return {Object} Data.
 */
YAHOO.widget.Column.prototype.parse = function(sMarkup) {
//TODO: builtin parsers YAHOO.widget.Column.PARSEDATE, PARSEINT, PARSEFLOAT, and custom parsers
    var data = null;
    switch(this.type) {
        case "checkbox":
            data = YAHOO.widget.Column.checkboxParser(sMarkup);
            break;
        case "currency":
            data = YAHOO.widget.Column.currencyParser(sMarkup);
            break;
        case "custom":
            data = YAHOO.widget.Column.customParser(sMarkup);
            break;
        case "date":
            data = YAHOO.widget.Column.dateParser(sMarkup);
            break;
        case "float":
            data = YAHOO.widget.Column.floatParser(sMarkup);
            break;
        case "html":
            data = YAHOO.widget.Column.htmlParser(sMarkup);
            break;
        case "number":
            data = YAHOO.widget.Column.numberParser(sMarkup);
            break;
        case "select":
            data = YAHOO.widget.Column.selectParser(sMarkup);
            break;
       default:
            if(sMarkup) {
                data = sMarkup;
            }
            break;
    }
    return data;
};

/**
 * Default parser for columns of type "checkbox" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method checkboxParser
 * @param sMarkup
 * @return {bChecked} True if checkbox is checked.
 */
YAHOO.widget.Column.checkboxParser = function(sMarkup) {
    return (sMarkup.indexOf("checked") < 0) ? false : true;
};

/**
 * Default parser for columns of type "currency" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method currencyParser
 * @param sMarkup
 * @return {nAmount} Floating point amount.
 */
YAHOO.widget.Column.currencyParser = function(sMarkup) {
    return parseFloat(sMarkup.substring(1));
};

/**
 * Default parser for columns of type "custom" takes markup and extracts data.
 * Should be overridden for custom parsing.
 *
 * @method customParser
 * @param sMarkup
 * @return {oData} Data.
 */
YAHOO.widget.Column.customParser = function(sMarkup) {
    return sMarkup;
};

/**
 * Default parser for columns of type "date" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method dateParser
 * @param sMarkup
 * @return {oDate} Date instance.
 */
YAHOO.widget.Column.dateParser = function(sMarkup) {
    var mm = sMarkup.substring(0,sMarkup.indexOf("/"));
    sMarkup = sMarkup.substring(sMarkup.indexOf("/")+1);
    var dd = sMarkup.substring(0,sMarkup.indexOf("/"));
    var yy = sMarkup.substring(sMarkup.indexOf("/")+1);
    return new Date(yy, mm, dd);
};

/**
 * Default parser for columns of type "float" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method floatParser
 * @param sMarkup
 * @return {nFloat} Float number.
 */
YAHOO.widget.Column.floatParser = function(sMarkup) {
    return parseFloat(sMarkup);
};

/**
 * Default parser for columns of type "html" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method htmlParser
 * @param sMarkup
 * @return {sMarkup} HTML markup.
 */
YAHOO.widget.Column.htmlParser = function(sMarkup) {
    return sMarkup;
};

/**
 * Default parser for columns of type "number" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method numberParser
 * @param sMarkup
 * @return {nNumber} Number.
 */
YAHOO.widget.Column.numberParser = function(sMarkup) {
    return parseInt(sMarkup);
};

/**
 * Default parser for columns of type "select" takes markup and extracts data.
 * Can be overridden for custom parsing.
 *
 * @method selectParser
 * @param sMarkup
 * @return {sValue} Value of selected option.
 */
YAHOO.widget.Column.selectParser = function(sMarkup) {
    //return (sMarkup.indexOf("checked") < 0) ? false : true;
};

/**
 * Outputs editor markup into the given TD based on given Record.
 *
 * @method showEditor
 * @param elCell {HTMLElement} The cell to edit.
 * @param oRecord {YAHOO.widget.Record} The DataTable Record of the cell.
 * @return YAHOO.widget.ColumnEditor
 */
YAHOO.widget.Column.prototype.getEditor = function(elCell, oRecord) {
//Sync up the arg signature for ColumnEditor constructor and show()
    var oEditor = this.editor;
    if(oEditor.constructor == String) {
        oEditor = new YAHOO.widget.ColumnEditor(this.editor);
        oEditor.show(elCell, oRecord, this);
        this.editor = oEditor;
    }
    else if(oEditor instanceof YAHOO.widget.ColumnEditor) {
        oEditor.show(elCell, oRecord, this);
    }
    return oEditor;
};


/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * The ColumnEditor defines and manages inline editing functionality for a
 * DataTable Column.
 *
 * @class ColumnEditor
 * @constructor
 * @param elCell {HTMLElement} The cell to edit.
 * @param oRecord {YAHOO.widget.Record} The DataTable Record of the cell.
 * @param oColumn {YAHOO.widget.Column} The DataTable Column of the cell.
 * @parem sType {String} Type identifier
 */
YAHOO.widget.ColumnEditor = function(sType) {
    this.type = sType;

    //TODO: make sure columneditors get destroyed if widget gets destroyed
    // Works better to attach ColumnEditor to document.body
    // rather than the DataTable container
    // elTable comes in as a cell. Traverse up DOM to find the table.
    // TODO: safety net in case table is never found.
    //while(elCell.nodeName.toLowerCase() != "table") {
    //    elCell = elCell.parentNode;
    //}
    //this.tableContainer = elCell.parentNode;
    
    var container = document.body.appendChild(document.createElement("div"));//this.tableContainer.appendChild(document.createElement("div"));
    container.style.position = "absolute";
    container.style.zIndex = 9000;
    container.id = "yui-dt-coled" + YAHOO.widget.ColumnEditor._nCount;
    this.container = container;

    switch(this.type) {
        case "textbox":
            this.createTextboxEditor();
            break;
        default:
            break;
    }

    YAHOO.widget.ColumnEditor._nCount++;
};



/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal instance counter.
 *
 * @property _nCount
 * @type Number
 * @static
 * @default 0
 */
YAHOO.widget.ColumnEditor._nCount =0;

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Reference to the container DOM element for the ColumnEditor.
 *
 * @property container
 * @type HTMLElement
 */
YAHOO.widget.ColumnEditor.prototype.container = null;

/**
 * Reference to the Column object for the ColumnEditor.
 *
 * @property column
 * @type YAHOO.widget.Column
 */
YAHOO.widget.ColumnEditor.prototype.column = null;

/**
 * Type of editor: "textbox", etc.
 *
 * @property type
 * @type String
 */
YAHOO.widget.ColumnEditor.prototype.type = null;



/**
 * Reference to form element(s) of the ColumnEditor.
 *
 * @property input
 * @type HTMLElement || HTMLElement[]
 */
YAHOO.widget.ColumnEditor.prototype.input = null;

/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Shows ColumnEditor.
 *
 * @method show
 * @param elCell {HTMLElement} The cell to edit.
 * @param oRecord {YAHOO.widget.Record} The DataTable Record of the cell.
 * @param oColumn {YAHOO.widget.Column} The DataTable Column of the cell.
 */
YAHOO.widget.ColumnEditor.prototype.show = function(elCell, oRecord, oColumn) {
    this.cell = elCell;
    this.record = oRecord;
    this.column = oColumn;
    switch(this.type) {
        case "textbox":
            this.showTextboxEditor(elCell, oRecord, oColumn);
            break;
        default:
            break;
    }
}

/**
 * Returns ColumnEditor data value.
 *
 * @method getValue
 * @return Object
 */
YAHOO.widget.ColumnEditor.prototype.getValue = function() {
    switch(this.type) {
        case "textbox":
            return this.getTextboxEditorValue();
            break;
        default:
            break;
    }
};

/**
 * Creates a textbox editor in the DOM.
 *
 * @method createTextboxEditor
 * @return {HTML} ???
 */
YAHOO.widget.ColumnEditor.prototype.createTextboxEditor = function() {
    var elTextbox = this.container.appendChild(document.createElement("input"));
    // For FF bug 236791
    elTextbox.setAttribute("autocomplete","off");
    this.input = elTextbox;
};

/**
 * Shows ColumnEditor
 *
 * @method showTextboxEditor
 * @param elCell {HTMLElement} The cell to edit.
 * @param oRecord {YAHOO.widget.Record} The DataTable Record of the cell.
 * @param oColumn {YAHOO.widget.Column} The DataTable Column of the cell.
 */
YAHOO.widget.ColumnEditor.prototype.showTextboxEditor = function(elCell, oRecord, oColumn) {
    // Size and value
    this.input.style.width = (parseInt(elCell.offsetWidth)-7) + "px";
    this.input.style.height = (parseInt(elCell.offsetHeight)-7) + "px";
    this.input.value = elCell.innerHTML;

    // Position and show
    var x,y;
    
    // Don't use getXY for Opera
    if(navigator.userAgent.toLowerCase().indexOf("opera") != -1) {
        x = elCell.offsetLeft;
        y = elCell.offsetTop;
        while(elCell.offsetParent) {
            x += elCell.offsetParent.offsetLeft;
            y += elCell.offsetParent.offsetTop
            elCell = elCell.offsetParent;
        }
    }
    else {
        var xy = YAHOO.util.Dom.getXY(elCell);
        x = parseInt(YAHOO.util.Dom.getX(elCell))//xy[0] + 1;
        y = parseInt(YAHOO.util.Dom.getY(elCell))//xy[1] + 1;
    }
    //YAHOO.log("xy "+xy,"debug",this.toString());
    //YAHOO.log("x "+x,"debug",this.toString());
    //YAHOO.log("y "+y,"debug",this.toString());
    this.container.style.left = x + "px";
    this.container.style.top = y + "px";
    this.container.style.display = "block";

    this.input.tabIndex = 0;
    this.input.focus();
    this.input.select();
};

/**
 * Hides ColumnEditor
 *
 * @method hide
 */
YAHOO.widget.ColumnEditor.prototype.hide = function() {
    this.input.tabIndex = -1;
    this.container.style.display = "none";
};

/**
 * Returns ColumnEditor value
 *
 * @method getTextboxEditorValue
 * @return String
 */
YAHOO.widget.ColumnEditor.prototype.getTextboxEditorValue = function() {
    return this.input.value;
};

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * Sort utility class to support column sorting.
 *
 * @class Sort
 * @static
 */

YAHOO.util.Sort = {};

/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Comparator function for sort in ascending order. String sorting is case insensitive.
 *
 * @method compareAsc
 * @param a {object} First sort argument.
 * @param b {object} Second sort argument.
 */
YAHOO.util.Sort.compareAsc = function(a, b) {
    //TODO: is typeof better or is constructor property better?
    if(a.constructor == String) {
        a = a.toLowerCase();
    }
    if(b.constructor == String) {
        b = b.toLowerCase();
    }
    if(a < b) {
        return -1;
    }
    else if (a > b) {
        return 1;
    }
    else {
        return 0;
    }
};

/**
 * Comparator function for sort in descending order. String sorting is case insensitive.
 *
 * @method compareDesc
 * @param a {object} First sort argument.
 * @param b {object} Second sort argument.
 */
YAHOO.util.Sort.compareDesc = function(a, b) {
    //TODO: is typeof better or is constructor property better?
    if(a.constructor == String) {
        a = a.toLowerCase();
    }
    if(b.constructor == String) {
        b = b.toLowerCase();
    }
    if(a < b) {
        return 1;
    }
    else if (a > b) {
        return -1;
    }
    else {
        return 0;
    }
};

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * WidthResizer subclasses DragDrop to support resizeable columns.
 *
 * @class WidthResizer
 * @extends YAHOO.util.DragDrop
 * @constructor
 * @param colElId {string} ID of the column element being resized
 * @param handleElId {string} ID of the handle element that causes the resize
 * @param sGroup {string} Group name of related DragDrop items
 */
YAHOO.util.WidthResizer = function(oDataTable, colId, handleId, sGroup, config) {
    if (colId) {
        this.cell = YAHOO.util.Dom.get(colId);
        this.init(handleId, sGroup, config);
        //this.initFrame();
        this.datatable = oDataTable;
        this.setYConstraint(0,0);
    }
    else {
        YAHOO.log("Column resizer could not be created due to invalid colElId","warn");
    }
};

if(YAHOO.util.DD) {
    YAHOO.extend(YAHOO.util.WidthResizer, YAHOO.util.DD);
}

/////////////////////////////////////////////////////////////////////////////
//
// Public DOM event handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Handles mousedown events on the column resizer.
 *
 * @method onMouseDown
 * @param e {string} The mousedown event
 */
YAHOO.util.WidthResizer.prototype.onMouseDown = function(e) {
    this.startWidth = this.cell.offsetWidth;
    this.startPos = YAHOO.util.Dom.getX(this.getDragEl());

    if(this.datatable.fixedwidth) {
        var cellText = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_COLUMNTEXT,"span",this.cell)[0];
        this.minWidth = cellText.offsetWidth + 6;
        var sib = this.cell.nextSibling;
        var sibCellText = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_COLUMNTEXT,"span",sib)[0];
        this.sibMinWidth = sibCellText.offsetWidth + 6;
//!!
        var left = ((this.startWidth - this.minWidth) < 0) ? 0 : (this.startWidth - this.minWidth);
        var right = ((sib.offsetWidth - this.sibMinWidth) < 0) ? 0 : (sib.offsetWidth - this.sibMinWidth);
        this.setXConstraint(left, right);
        YAHOO.log("cellstartwidth:" + this.startWidth,"time");
        YAHOO.log("cellminwidth:" + this.minWidth,"time");
        YAHOO.log("sibstartwidth:" + sib.offsetWidth,"time");
        YAHOO.log("sibminwidth:" + this.sibMinWidth,"time");
        YAHOO.log("l:" + left + " AND r:" + right,"time");
    }

};

/**
 * Handles mouseup events on the column resizer.
 *
 * @method onMouseUp
 * @param e {string} The mouseup event
 */
YAHOO.util.WidthResizer.prototype.onMouseUp = function(e) {
    //TODO: replace the resizer where it belongs:
    var resizeStyle = YAHOO.util.Dom.get(this.handleElId).style;
    resizeStyle.left = "auto";
    resizeStyle.right = 0;
    resizeStyle.marginRight = "-6px";
    resizeStyle.width = "6px";
    //.yui-dt-headresizer {position:absolute;margin-right:-6px;right:0;bottom:0;width:6px;height:100%;cursor:w-resize;cursor:col-resize;}


    //var cells = this.datatable._elTable.tHead.rows[this.datatable._elTable.tHead.rows.length-1].cells;
    //for(var i=0; i<cells.length; i++) {
        //cells[i].style.width = "5px";
    //}

    //TODO: set new columnset width values
    this.datatable.fireEvent("columnResizeEvent",{datatable:this.datatable,target:YAHOO.util.Dom.get(this.id)});
};

/**
 * Handles drag events on the column resizer.
 *
 * @method onDrag
 * @param e {string} The drag event
 */
YAHOO.util.WidthResizer.prototype.onDrag = function(e) {
    var newPos = YAHOO.util.Dom.getX(this.getDragEl());//YAHOO.log("newpos:"+newPos,"warn");//YAHOO.util.Event.getPageX(e);
    var offsetX = newPos - this.startPos;//YAHOO.log("offset:"+offsetX,"warn");
    //YAHOO.log("startwidth:"+this.startWidth + " and offset:"+offsetX,"warn");
    var newWidth = this.startWidth + offsetX;//YAHOO.log("newwidth:"+newWidth,"warn");

    if(newWidth < this.minWidth) {
        newWidth = this.minWidth;
    }

    // Resize the column
    var oDataTable = this.datatable;
    var elCell = this.cell;

    //YAHOO.log("newwidth" + newWidth,"warn");
    //YAHOO.log(newWidth + " AND "+ elColumn.offsetWidth + " AND " + elColumn.id,"warn");

    // Resize the other columns
    if(oDataTable.fixedwidth) {
        // Moving right or left?
        var sib = elCell.nextSibling;
        //var sibIndex = elCell.index + 1;
        var sibnewwidth = sib.offsetWidth - offsetX;
        if(sibnewwidth < this.sibMinWidth) {
            sibnewwidth = this.sibMinWidth;
        }

        //TODO: how else to cycle through all the columns without having to use an index property?""
        for(var i=0; i<oDataTable._oColumnSet.length; i++) {
            if((i != elCell.index) &&  (i!=sibIndex)) {
                YAHOO.util.Dom.get(oDataTable._oColumnSet.keys[i].id).style.width = oDataTable._oColumnSet.keys[i].width + "px";
            }
        }
        sib.style.width = sibnewwidth;
        elCell.style.width = newWidth + "px";
        //oDataTable._oColumnSet.flat[sibIndex].width = sibnewwidth;
        //oDataTable._oColumnSet.flat[elCell.index].width = newWidth;

    }
    else {
        elCell.style.width = newWidth + "px";
    }
};




/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * A RecordSet defines and manages a set of Records.
 *
 * @class RecordSet
 * @param data {Object || Object[]} An object literal or an array of data.
 * @constructor
 */
YAHOO.widget.RecordSet = function(data) {
    // Internal variables
    this._nIndex = YAHOO.widget.RecordSet._nCount;
    this._records = [];
    
    if(data) {
        if(data.constructor == Array) {
            this.addRecords(data);
        }
        else if(data.constructor == Object) {
            this.addRecord(data);
        }
    }
    
    YAHOO.widget.RecordSet._nCount++;
    YAHOO.log("RecordSet initialized", "info", this.toString());
};

YAHOO.augment(YAHOO.widget.RecordSet, YAHOO.util.EventProvider);

/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////
/**
 * Internal class variable to index multiple data table instances.
 *
 * @property _nCount
 * @type number
 * @private
 * @static
 */
YAHOO.widget.RecordSet._nCount = 0;

/**
 * Instance index.
 *
 * @property _nIndex
 * @type number
 * @private
 */
YAHOO.widget.RecordSet.prototype._nIndex = null;

/**
 * Internal counter of how many records are in the RecordSet
 *
 * @property _length
 * @private
 */
YAHOO.widget.RecordSet.prototype._length = null;

/////////////////////////////////////////////////////////////////////////////
//
// Private methods
//
/////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Public accessor to the unique name of the RecordSet instance.
 *
 * @method toString
 * @return {string} Unique name of the RecordSet instance
 */
YAHOO.widget.RecordSet.prototype.toString = function() {
    return "RecordSet instance " + this._nIndex;
};

/**
 * Returns the number of non-null records in the sparse RecordSet
 *
 * @method getLength
 * @return {Number} Number records in the RecordSet
 */
YAHOO.widget.RecordSet.prototype.getLength = function() {
        return this._length;
};

/**
 * Replaces entire RecordSet with given new records.
 *
 * @method replaceAll
 * @param aNewRecords {Array} New array of records
 */
/*YAHOO.widget.RecordSet.prototype.replaceAllRecords = function(aNewObjectLiteral) {
    this._init(aNewObjectLiterals);
};*/

/**
 * Returns record with given name, at the given index, or null.
 *
 * @method getRecord
 * @param identifier {String || Number} Record ID or record index
 * @return {Object} Record object
 */
YAHOO.widget.RecordSet.prototype.getRecord = function(identifier) {
    if(identifier) {
        if(identifier.constructor == String) {
            for(var i=0; i<this._records.length; i++) {
                if(this._records[i].id == identifier) {
                    return this._records[i];
                }
            }
            return null;
        }
        else {
            return this._records[identifier];
        }
    }
    return null;
};

/**
 * Returns an array of Records from the RecordSet.
 *
 * @method getRecords
 * @param i {number} Index of which record to start at
 * @param range {number} (optional) Number of records to get
 * @return {Array} Array of records starting at given index and lenth equal to
 * given range. If range is null, entire RecordSet array is returned.
 */
YAHOO.widget.RecordSet.prototype.getRecords = function(i, range) {
    if(i === undefined) {
        return this._records;
    }
    i = parseInt(i);
    if(isNaN(i)) {
        return null;
    }
    if(range === undefined) {
        return this._records.slice(i);
    }
    range = parseInt(range);
    if(isNaN(range)) {
        return null;
    }
    return this._records.slice(i, i+range);
};

/**
 * Returns index for the given record.
 *
 * @method getRecordIndex
 * @param oRecord {object} Record object
 * @return {number} index
 */

/*YAHOO.widget.RecordSet.prototype.getRecordIndex = function(oRecord) {
    //TODO: return i;
};*/

/**
 * Returns the record(2) with the given value at the given key.
 *
 * @method getRecordBy
 * @param sKey {String} Key to search.
 * @param oValue {Object} to match against.
 * @return {YAHOO.widget.Record || YAHOO.widget.Record[]} Record or array of
 * Records with the given value at the given key, or null.
 */
/*YAHOO.widget.RecordSet.prototype.getRecordBy = function(sKey, oValue) {
     TODO: redo to match new algorithm
    var record = null;
    var length = this._records.length;
    for(var i=length-1; i>0; i--) {
        record = this._records[i];
        if(record && (record.extid == extId)) {
            return record;
        }
    }
    return null;

};*/

/**
 * Adds one Record to the RecordSet at the given index. If index is null,
 * then adds the Record to the end of the RecordSet.
 *
 * @method addRecord
 * @param oObjectLiteral {Object} An object literal of data.
 * @param index {Number} (optional) Position index.
 * @return {YAHOO.widget.Record} A Record instance.
 */
YAHOO.widget.RecordSet.prototype.addRecord = function(oObjectLiteral, index) {
    if(oObjectLiteral) {
        var oRecord = new YAHOO.widget.Record(oObjectLiteral);
        if(!isNaN(index) && (index > -1)) {
            this._records.splice(index,0,oRecord);
        }
        else {
            this._records.push(oRecord);
        }
        this._length++;
        return oRecord;
    }
    else {
        return null;
    }
};

/**
 * Adds multiple Records to the RecordSet at the given index. If index is null,
 * then adds the Records to the end of the RecordSet.
 *
 * @method addRecords
 * @param data {Object[]} An array of object literal data.
 * @param index {Number} (optional) Position index.
 * @return {YAHOO.widget.Record} An array of Record instances.
 */
YAHOO.widget.RecordSet.prototype.addRecords = function(data, index) {
    if(data) {
        if(data.constructor == Array) {
            var newRecords = [];
            // Can't go backwards bc we need to preserve order
            for(var i=0; i<data.length; i++) {
                var record = this.addRecord(data[i], index);
                newRecords.push(record);
           }
           return newRecords;
        }
        else if(data.constructor == Object) {
            return this.addRecord(data);
        }
    }
    else {
        return null;
    }
};

/**
 * Convenience method to append the given data to the end of the RecordSet.
 *
 * @method append
 * @param data {Object || Object[]} An object literal or array of data.
 * @return {YAHOO.widget.Record || YAHOO.widget.Record[]} A Record or array of Records.
 */
YAHOO.widget.RecordSet.prototype.append = function(data) {
    if(data) {
        if(data.constructor == Array) {
            var newRecords = [];
            // Cant't go backwards bc we need to preserve order
            for(var i=0; i<data.length; i++) {
                var record = this.addRecord(data[i]);
                newRecords.push(record);
           }
           return newRecords;
        }
        else if(data.constructor == Object) {
            return this.addRecord(data);
        }
    }
    else {
        return null;
    }
    
};

/**
 * Convenience method to insert the given data into the beginning of the RecordSet.
 *
 * @method insert
 * @param data {Object || Object[]} An object literal or array of data.
 * @return {YAHOO.widget.Record || YAHOO.widget.Record[]} A Record or array of Records.
 */
YAHOO.widget.RecordSet.prototype.insert = function(data) {
    if(data) {
        if(data.constructor == Array) {
            var newRecords = [];
            // Can't go backwards bc we need to preserve order
            for(var i=data.length-1; i>-1; i--) {
                var record = this.addRecord(data[i], 0);
                newRecords.push(record);
           }
           return newRecords;
        }
        else if(data.constructor == Object) {
            return this.addRecord(data, 0);
        }
    }
    else {
        return null;
    }
};

/**
 * Replaces all Records in RecordSet with new data.
 *
 * @method replace
 * @param data {Object || Object[]} An object literal or array or data.
 * @return {YAHOO.widget.Record || YAHOO.widget.Record[]} A Record or array of Records.
 */
YAHOO.widget.RecordSet.prototype.replace = function(data) {
    if(data) {
        this.reset();
        return this.append(data);
    }
    else {
        return null;
    }
};

/**
 * Sorts RecordSet by given function.
 *
 * @method sort
 * @param fnSort {Function} Reference to a sort function.
 * @return {Array} Sorted array of Records
 */
YAHOO.widget.RecordSet.prototype.sort = function(fnSort) {
    return this._records.sort(fnSort);
};


/**
 * Removes the record at the given index from the RecordSet. If a range is
 * given, starts at the given index and removes all records in the range.
 *
 * @method deleteRecord
 * @param i {Number} Record index
 * @param range {Number} (optional) Range of records to remove, or null.
 */
YAHOO.widget.RecordSet.prototype.deleteRecord = function(i, range) {
    if(!range || isNaN(range)) {
        range = 1;
    }
    if(i && !isNaN(i)) {
        this._records.splice(i, range);
        this._length = this._length - range;
    }
};

/**
 * Removes all Records from the RecordSet.
 *
 * @method reset
 */
YAHOO.widget.RecordSet.prototype.reset = function() {
    this._records = [];
    this._length = 0;
};


/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * The Record class defines a DataTable record.
 *
 * @class Record
 * @constructor
 * @param oConfigs {Object} (optional) Object literal of key/value pairs.
 */
YAHOO.widget.Record = function(oLiteral) {
    if(typeof oLiteral == "object") {
        for(var sKey in oLiteral) {
            if(sKey) {
                this[sKey] = oLiteral[sKey];
            }
        }
    }
    this.id = "yui-dtrec"+YAHOO.widget.Record._nCount;
    YAHOO.widget.Record._nCount++;
};

/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal class variable to index multiple data table instances.
 *
 * @property _nCount
 * @type number
 * @private
 * @static
 */
YAHOO.widget.Record._nCount = 0;

/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Unique name assigned at instantation, indicates original order.
 *
 * @property id
 * @type string
 */
YAHOO.widget.Record.prototype.id = null;

YAHOO.register("datatable", YAHOO.widget.DataTable, {version: "@VERSION@", build: "@BUILD@"});
