
// ++++++++++++  MODAL FORMS +++++++++++++++++++++++++++++++++++++++ PR2021-01-08
    "use strict";

    let m_MSE_dict = {};
// +++++++++ MODAL SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  m_MSE_open  ================ PR2020-03-19 PR2021-01-08
    function m_MSE_open(el_input, mod_MSE_dict) {
        console.log(" -----  m_MSE_open   ----")
        // called by EventListener of input employee and replacement in modal MGT_Teammember and (NIU yet: table teammember)
        // selected.team_pk and selected are only used in table teammember

        m_MSE_dict = mod_MSE_dict;

        console.log("m_MSE_dict.is_template_mode", m_MSE_dict.is_template_mode)

        const tlbRow = get_tablerow_selected(el_input)
        const is_grid = (!!get_attr_from_el(tlbRow, "data-isgrid"))

// +++++ show modal confirm when is_template_mode or when no team selected in table view
        // ---  add employee disabled in template mode, also in table when no team selected (grid mode is allowed)
        if(m_MSE_dict.is_template_mode || (!m_MSE_dict.sel_team_pk && !is_grid ) ){
            // PR2020-07-02 debug mod_confirm was under modgrid_team, therefore not showing.
            // z-index didnt work, putting mod_confirm after modgrid_team in scheme.html worked.
            // ---  show modal confirm with message 'First select employee'
            const msg_err01 = (is_template_mode) ? loc.can_only_enter_teammember_without_employee : loc.err_first_select_team
            const msg_err02 = (is_template_mode) ? loc.can_enter_employee_after_copying_template : null
            document.getElementById("id_confirm_header").innerText = loc.Select_employee + "...";
            document.getElementById("id_confirm_msg01").innerText = msg_err01;
            document.getElementById("id_confirm_msg02").innerText = msg_err02;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            add_or_remove_class(el_btn_save, "btn-secondary" , true,"btn-primary"  )
            setTimeout(function() {el_btn_save.focus()}, 50);
            $("#id_mod_confirm").modal({backdrop: true});

        } else {

// +++++ initiate modal select employee

    // ---  get teammember_pk_ from tlbRow
            const teammember_pk_str = get_attr_from_el(tlbRow, "data-pk")
            const team_pk_str = get_attr_from_el(tlbRow, "data-ppk")
            const tblName = get_attr_from_el(tlbRow, "data-table")
            const is_table = (!!get_attr_from_el(tlbRow, "data-istable", false))

    // ---  get fldName from el_input, fldName = 'employee' or 'replacement'
            const fldName = get_attr_from_el(el_input, "data-field")
            const is_replacement = (fldName === "replacement")

    // ---  create mod_MGT_dict[teammember_pk_str] when called by table. In grid mode mod_MGT_dict has already values
            //if (is_table){
                // TODO check if correct
                //mod_MGT_dict = {};
                //MGT_create_modMGT_tm_dict(teammember_pk_str, team_pk_str);
            //}

// ---  get employee / replacement name from mod_MGT_dict
            const dict = get_dict_value(mod_MGT_dict, [teammember_pk_str, fldName]);
            const pk_str = (dict && dict.pk) ? dict.pk : null;
            const empl_repl_code = (dict && dict.code) ? dict.code : "---";

            // always add fldName and is_table, both in grid mode and in table mode
            // key 'field' is stored in root of mod_MGT_dict to store 'employee' or 'replacement' for modal MSE
            m_MSE_dict = {
                field: fldName,
                istable: is_table,
                sel_tm_pk: teammember_pk_str, // can be 'new12'
                pk: pk_str,
                code: empl_repl_code
            }

// ---  put employee name in header
            let label_text = ((is_replacement) ? loc.Select_replacement_employee : loc.Select_employee ) + ":";
            let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
            let el_label_input = document.getElementById("id_MSE_label_employee")
            let el_div_remove = document.getElementById("id_MSE_div_btn_remove")

            el_header.innerText = (pk_str) ?  empl_repl_code : label_text;
            add_or_remove_class(el_div_remove, cls_hide, !pk_str)
            document.getElementById("id_MSE_label_employee").innerText = label_text

// ---  remove values from el_mod_employee_input
            let el_mod_employee_input = document.getElementById("id_MSE_input_employee")
            el_mod_employee_input.value = null

// ---  fill selecttable employee
            // always filter out cur_employee_pk, not replacement. In that way employee cannot replace himself PR2020-10-21
            const cur_employee_pk =  get_dict_value(mod_MGT_dict, [teammember_pk_str, "employee", "pk"]);
            MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement)
// ---  set focus to el_mod_employee_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){el_mod_employee_input.focus()}, 500);
// ---  show modal
            $("#id_mod_select_employee").modal({backdrop: true});
        }  //  if(!is_template_mode)
    };  // m_MSE_open

//=========  m_MSE_Save  ================ PR2020-03-17 PR2021-01-08
    function m_MSE_Save(action) {
        console.log("========= m_MSE_Save ===", action );  // action = 'save' or 'remove'
        // called by MSE_filter_employee, MSE_select_employee, MSE_btn_remove_employee, MSE_btn_remove_employee
        // m_MSE_dict = {code: "Regales, Ruëny", field: "employee", istable: false, pk: 3, sel_tm_pk: "new3"}

        const tblName = "teammember";
        const is_remove = (action ==="remove");
        const fldName = m_MSE_dict.field;
        const is_replacement = (fldName === "replacement");
        const is_calledby_tm_table = m_MSE_dict.istable;

        const tm_pk = (m_MSE_dict.sel_tm_pk) ? m_MSE_dict.sel_tm_pk : null;
        const empl_repl_pk = (!is_remove && m_MSE_dict.pk) ? m_MSE_dict.pk : null;
        const empl_repl_code = (!is_remove && m_MSE_dict.code) ? m_MSE_dict.code : "---";

        mod_MGT_dict[tm_pk][fldName] = {
            pk: empl_repl_pk,
            code: empl_repl_code,
            // mode: ""update
            };
        mod_MGT_dict.btn_save_enabled = true;

// remove replacement pk if employee and replacement are the same
        // (this is not necessary after selecting replacement, because employee is filtered out in select list
        let remove_rpl = false;
        if (!is_replacement && empl_repl_pk){
            const rpl_field = "replacement";
            const rpl_pk = get_dict_value(mod_MGT_dict, [tm_pk, rpl_field, "pk"]);
            if(rpl_pk && rpl_pk === empl_repl_pk){
                mod_MGT_dict[tm_pk][rpl_field].pk = null;
                mod_MGT_dict[tm_pk][rpl_field].code = "---";
                remove_rpl = true;
            }
        }

// +++++ called bij grid ModGridTeam
// when called by ModGridTeam: save in tblRow, When called by table Teammember: uploadchanges

        if(!is_calledby_tm_table) {

            MGT_BtnSaveDeleteEnable();

// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
            if(tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                const td = tblRow.cells[col_index];
                if(td){ td.children[0].innerText = empl_repl_code;}
                if(remove_rpl){
                    const td_rpl = tblRow.cells[3];
                    if(td_rpl){ td_rpl.children[0].innerText = "---";}
                }
            }
        } else {

// +++++ called bij table Teammember
// when called by table Teammember: upload changes
// TODO
/*
            let upload_dict = {};
            // TODO: get team_pk from tblRow
            const tm_is_create = (!!get_dict_value(mod_MGT_dict, [tm_pk, "create"], false));
            const team_pk = null;
            if (tm_is_create) {
                upload_dict = {id: {temp_pk: tm_pk, ppk: team_pk, table: tblName, create: true}};
            } else {
                upload_dict = {id: {pk: tm_pk, ppk: team_pk, table: tblName}};
            }
            upload_dict[fldName] = {pk: empl_repl_pk, code: empl_repl_code, update: true};
            UploadChanges(upload_dict, url_teammember_upload, "MSE_Save");

// ---  put code in tblRow
            const row_id = "teammember_" + tm_pk.toString();
            let tblRow = document.getElementById(row_id);
            if(!!tblRow){
                const col_index = (is_replacement) ? 3 : 0;
                let td = tblRow.cells[col_index];
                if(!!td){
                    let cell = td.children[0];
                    cell.value = employee_code;
                }
            }
  */
        }
// ---  hide modal
        $("#id_mod_select_employee").modal("hide");

        console.log("mod_MGT_dict", deepcopy_dict(mod_MGT_dict) );
    } // m_MSE_Save

//=========  m_MSE_select_employee ================ PR2020-03-19 PR2020-09-09 PR2021-01-08
    function m_MSE_select_employee(tblRow) {
        console.log( "===== m_MSE_select_employee ========= ");
        // tblRow is the selected tblRow in the employee table of Mod_Select_Employee

// ---  deselect all highlighted rows in the employee table
        DeselectHighlightedRows(tblRow, cls_selected)
        if(tblRow) {

// ---  highlight clicked row in the employee table
            tblRow.classList.add(cls_selected)

// ---  get map_dict from employee_map
            const selected_pk = get_attr_from_el_int(tblRow, "data-pk")
            const selected_value = get_attr_from_el(tblRow, "data-value")

            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_pk);
            if (!isEmpty(map_dict)){

// ---  put employee info in m_MSE_dict
            m_MSE_dict.pk = selected_pk
            m_MSE_dict.code = selected_value

// ---  put employee_code / replacemenet_code  in el_input_employee
                document.getElementById("id_MSE_input_employee").value = selected_value // null value is ok, will show placeholder
// ---  save selected employee
                MSE_Save("save")
            }  // if (!isEmpty(map_dict)){
        }  // if(!!tblRow) {
    }

//=========  m_MSE_put_employee_in_MGT_dict  ================ PR2020-04-18 PR2020-09-09  PR2021-01-08
    function m_MSE_put_employee_in_MGT_dict(map_dict) {
        console.log( "  -----  MSE_put_employee_in_MGT_dict  -----");
        // ---  put employee info in field employee or replacement of selected teammember in mod_MGT_dict
        // will be null when no employee
        // function is called by MSE_filter_employee and MSE_select_employee

        const teammember_pk = mod_MGT_dict.sel_tm_pk;
        const field = mod_MGT_dict.field; // field is 'employee' or 'replacement'
        const teammember_dict = mod_MGT_dict[teammember_pk];
        if(teammember_dict && ["employee", "replacement"].indexOf(field) > -1){
            teammember_dict[field] = {pk: map_dict.id, code: map_dict.code}
        }
    }  // m_MSE_put_employee_in_MGT_dict

//=========  m_MSE_filter_employee  ================ PR2019-05-26 PR2021-01-08
    function m_MSE_filter_employee(option, event_key) {
        console.log( "===== m_MSE_filter_employee  ========= ", option);
        //console.log( "event_key", event_key);

        let el_input = document.getElementById("id_MSE_input_employee")

        let new_filter = el_input.value;
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_employee_dict
                //mod_employee_dict = {};
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let has_selection = false, has_multiple = false;
        let select_value = null, select_pk = null, select_parentpk = null;
        let tblbody = document.getElementById("id_ModSelEmp_tbody_employee");
        if (!skip_filter){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; tblRow = tblbody.rows[row_index]; row_index++) {
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
// hide current employee -> is already filtered out in MSE_FillSelectTableEmployee
                    code_value = get_attr_from_el_str(tblRow, "data-value")
                    if (!!code_value){
// check if code_value contains filter_mod_employee
                        const code_value_lower = code_value.toLowerCase();
                        show_row = (code_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put select_pk from first selected row in select_value
                    if(!has_selection ) {
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_input /  mod_employee_dict
        if (has_selection && !has_multiple ) {

// ---  get employee_dict from employee_map
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk);
// ---  put employee info in m_MSE_dict
            m_MSE_dict.pk = select_pk
            m_MSE_dict.code = (employee_dict.code) ? employee_dict.code : null;

            console.log( "m_MSE_dict", m_MSE_dict);
// ---  highlight selected row
            // TODO debug error: 'Failed to execute 'getElementById' on 'Document': 1 argument required, but only 0 present.
            // const tblRow = document.getElementById()
// put code_value of selected employee in el_input
            el_input.value = employee_dict.code;
            el_MSE_btn_save.focus();
        }
    }; // m_MSE_filter_employee

//========= m_MSE_FillSelectTableEmployee  ============= PR2019-08-18 PR2021-01-08
    function m_MSE_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        //console.log( "=== MSE_FillSelectTableEmployee ");
        //console.log( "cur_employee_pk", cur_employee_pk);

        const caption_one = (is_replacement) ? loc.Select_replacement_employee : loc.Select_employee;
        const caption_none = loc.No_employees + ":";

        let tableBody = document.getElementById("id_ModSelEmp_tbody_employee");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, map_dict] of employee_map.entries()) {
                const pk_int = map_dict.id;
                const ppk_int = map_dict.comp_id;
                const code = map_dict.code;
                const is_inactive = map_dict.inactive;

//- skip selected employee
// Note: cur_employee_pk gets value from el_input, not from selected.teammember_pk because it can also contain replacement
// PR20019-12-17 debug: also filter inactive, but keep inaclive in employee_map, to show them in teammember
// PR2020-10-21 debug: always filter out cur_employee_pk, not replacement. In that way employee cannot replace himself
                if (pk_int !== cur_employee_pk && !is_inactive){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.id = "sel_employee_" + pk_int;
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code);

//- add hover to tableBody row
                    add_hover(tblRow)
//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MSE_select_employee(tblRow)}, false )
// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected.teammember_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // m_MSE_FillSelectTableEmployee

// +++++++++ END MODAL SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++